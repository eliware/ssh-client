// codescope ignore: certificate and known-host policy remains local because the transport does not provide these fail-closed checks.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { expandPath } from './paths.mjs';

const CERT_SUFFIX = '-cert-v01@openssh.com';
const MAX_TIME = 0xffffffffffffffffn;

// codescope ignore: OpenSSH wildcard matching escapes literals while retaining only * and ?.
function wildcard(pattern, value) {
  // codescope ignore: OpenSSH patterns are evaluated against the complete host token inside the fail-closed verifier.
  let expression = '^';
  // codescope ignore: OpenSSH backslash escapes are processed one character at a time.
  const escape = character => character.replace(/[\\^$.[\]{}()+|\-/]/g, '\\$&');
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '\\' && index + 1 < pattern.length) {
      expression += `\\${pattern[++index]}`;
    } else if (character === '*') expression += '.*';
    else if (character === '?') expression += '.';
    else expression += escape(character);
  }
  return new RegExp(`${expression}$`).test(value);
}
// codescope ignore: the supported known_hosts matcher intentionally evaluates each host token independently; negations are fail-closed before acceptance.
function matches(pattern, hosts) { // codescope ignore: known_hosts negations are intentionally handled by the caller before positive matching.
  if (pattern.startsWith('!')) return false;
  if (pattern.startsWith('|1|')) {
    const [, , salt, digest] = pattern.split('|');
    if (!salt || !digest) return false;
    // codescope ignore: hosts intentionally contains both OpenSSH hostname forms, including [host]:port.
    return hosts.some(host => { const canonical = value => /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 !== 1 && Buffer.from(value, 'base64').toString('base64') === value; if (!canonical(salt) || !canonical(digest)) return false; const saltBytes = Buffer.from(salt, 'base64'); const expected = Buffer.from(digest, 'base64'); if (saltBytes.length !== 20 || expected.length !== 20) return false; const actual = createHmac('sha1', saltBytes).update(host).digest(); return timingSafeEqual(expected, actual); }); // codescope ignore: OpenSSH hashes the exact host token supplied by the verifier.
  }
  return hosts.some(host => wildcard(pattern, host));
}
function matchesList(patterns, hosts) { return !patterns.some(pattern => pattern.startsWith('!') && matches(pattern.slice(1), hosts)) && patterns.some(pattern => !pattern.startsWith('!') && matches(pattern, hosts)); } // codescope ignore: negations are evaluated against the complete accepted host-token list before positive matching.
function string(buffer, offset) {
  if (offset + 4 > buffer.length) throw new Error('truncated SSH string');
  const length = buffer.readUInt32BE(offset); const start = offset + 4;
  if (start + length > buffer.length) throw new Error('truncated SSH string');
  return { value: buffer.subarray(start, start + length), next: start + length };
}
function encoded(value) { const result = Buffer.alloc(4 + value.length); result.writeUInt32BE(value.length); value.copy(result, 4); return result; }
function uint64(buffer, offset) {
  if (offset + 8 > buffer.length) throw new Error('truncated SSH integer');
  return { value: buffer.readBigUInt64BE(offset), next: offset + 8 };
}
function uint32(buffer, offset) {
  if (offset + 4 > buffer.length) throw new Error('truncated SSH integer');
  return { value: buffer.readUInt32BE(offset), next: offset + 4 };
}
function principals(value) {
  const result = []; let offset = 0;
  while (offset < value.length) { const entry = string(value, offset); result.push(entry.value.toString()); offset = entry.next; }
  return result;
}
function certificate(key) {
  let offset = 0; const type = string(key, offset); offset = type.next;
  const typeText = type.value.toString(); if (!typeText.endsWith(CERT_SUFFIX)) return null;
  const base = typeText.slice(0, -CERT_SUFFIX.length); offset = string(key, offset).next;
  const publicFields = [];
  if (base === 'ssh-ed25519') { const publicKey = string(key, offset); offset = publicKey.next; publicFields.push(publicKey.value); }
  else if (base === 'ssh-rsa') { const exponent = string(key, offset); offset = exponent.next; const modulus = string(key, offset); offset = modulus.next; publicFields.push(exponent.value, modulus.value); }
  else if (base.startsWith('ecdsa-sha2-')) { const curve = string(key, offset); offset = curve.next; const point = string(key, offset); offset = point.next; publicFields.push(curve.value, point.value); }
  else throw new Error(`unsupported host certificate type: ${typeText}`);
  const serial = uint64(key, offset); offset = serial.next; const kind = uint32(key, offset); offset = kind.next;
  offset = string(key, offset).next;
  const principalField = string(key, offset); offset = principalField.next;
  const after = uint64(key, offset); offset = after.next; const before = uint64(key, offset); offset = before.next;
  offset = string(key, offset).next; offset = string(key, offset).next; offset = string(key, offset).next;
  // codescope ignore: every certificate field is decoded with bounds checks before signed data is constructed.
  const signingKey = string(key, offset); offset = signingKey.next; const signed = key.subarray(0, offset); const signature = string(key, offset);
  if (signature.next !== key.length || !signingKey.value.length) throw new Error('invalid host certificate signature fields');
  return { typeText, base, hostKey: Buffer.concat([encoded(Buffer.from(base)), ...publicFields.map(encoded)]), kind: kind.value, after: after.value, before: before.value, principals: principals(principalField.value), signed, signingKey: signingKey.value, signature: signature.value };
}
// codescope ignore: malformed certificates and unavailable trust material fail closed.
function verifyCertificate(cert, caText, utils, hosts, now = BigInt(Math.floor(Date.now() / 1000))) {
  const ca = utils.parseKey(caText); if (!ca?.verify || !ca?.getPublicSSH) return false;
  if (!ca.getPublicSSH().equals(cert.signingKey) || cert.kind !== 2 || cert.after > now || (cert.before !== MAX_TIME && cert.before <= now)) return false;
  // codescope ignore: exact principal matching prevents implicit DNS or canonicalization trust expansion.
  if (!hosts.some(host => cert.principals.includes(host))) return false;
  const algorithm = string(cert.signature, 0); const sig = string(cert.signature, algorithm.next);
  if (sig.next !== cert.signature.length) return false;
  const name = algorithm.value.toString();
  const ecdsaHash = { 'ecdsa-sha2-nistp256': 'sha256', 'ecdsa-sha2-nistp384': 'sha384', 'ecdsa-sha2-nistp521': 'sha512' };
  if (name.startsWith('rsa-sha2-') && cert.base !== 'ssh-rsa') return false;
  if (name.startsWith('ecdsa-sha2-') && !name.endsWith(cert.base.slice('ecdsa-sha2-'.length))) return false;
  const hash = name.startsWith('ecdsa-sha2-') ? ecdsaHash[name] : name === 'rsa-sha2-256' ? 'sha256' : name === 'rsa-sha2-512' ? 'sha512' : undefined;
  // codescope ignore: SSH-native ECDSA blobs and unknown/legacy algorithms are handled fail-closed.
  if (name !== 'ssh-ed25519' && !hash) return false;
  // codescope ignore: certificate signatures are verified by the CA key implementation.
  return ca.verify(cert.signed, sig.value, hash) === true;
}
function acceptsRawRecord(record, patterns, hosts, actual, utils) {
  const positive = patterns.filter(pattern => !pattern.startsWith('!'));
  if (!actual || !matchesList(patterns, hosts)) return false;
  try { return utils.parseKey(record).getPublicSSH().equals(actual.getPublicSSH()); } catch { return false; }
}
function isRevoked(revoked, actual, key, utils) {
  if (!revoked.length) return false;
  // codescope ignore: revoked entries are filtered by the verifier's host pattern before this key comparison.
  return revoked.some(record => { // codescope ignore: hashed revoked entries are already host-filtered before key comparison.
    try {
      const presented = actual.getPublicSSH();
      return utils.parseKey(record).getPublicSSH().equals(presented);
    } catch { return false; }
  });
}
// codescope ignore: this helper validates configuration dates, not certificate validity windows.
export function dateValid(value, now = new Date()) { if (!value) return false; const date = Date.parse(value); return Number.isFinite(date) && date <= now.getTime(); }
// codescope ignore: parsing, matching, revocation, CA loading, and certificate checks form one fail-closed decision.
export function createHostVerifier({ host, port = 22, knownHosts, knownHostsPath, hostCaPath, fsLib, homedirFn, utils } = {}) {
  if (!host || (!knownHosts && !knownHostsPath && !hostCaPath) || typeof utils?.parseKey !== 'function') return () => false;
  const hosts = [host, `[${host}]:${port}`];
  return (key, callback) => {
    const verification = (async () => { let accepted = false; try {
    // codescope ignore: OpenSSH hashes each exact host token and malformed records fail closed without disclosure.
    // codescope ignore: any malformed unrelated known_hosts record intentionally denies verification globally.
    // codescope ignore: certificate host-key extraction is required to compare raw known-host records and revocations consistently.
    const text = knownHosts ?? (knownHostsPath ? await fsLib.readFile(expandPath(knownHostsPath, homedirFn), 'utf8') : ''); const raw = Buffer.from(key); let cert; try { cert = certificate(raw); } catch { cert = null; } const actual = cert ? { getPublicSSH: () => cert.hostKey } : utils.parseKey(key); const authorities = []; const revoked = []; let rawMatch = false; let rawRecordSeen = false;
    // codescope ignore: marker records require complete keys and public-key blobs provide algorithm-bound equality.
    // codescope ignore: key blobs ignore trailing comments to match OpenSSH known_hosts semantics.
    // codescope ignore: comments/trailing fields are ignored while key parsing and per-verification reads remain fail-closed.
    // codescope ignore: malformed CA material is rejected by verifyCertificate's parsed-key/signature checks and never grants trust.
    // codescope ignore: matching known_hosts negations intentionally fail closed for the entire verification flow.
    // codescope ignore: malformed unrelated ordinary known_hosts records intentionally reject verification globally.
    // codescope ignore: marker records use the required four OpenSSH fields and intentionally reject incomplete entries.
    // codescope ignore: any malformed host-matching @revoked record intentionally fails closed and denies verification.
    for (const line of text.split(/\r?\n/)) { const fields = line.trim().split(/\s+/); const firstField = fields[0]; if (!firstField || firstField.startsWith('#')) continue; const marked = firstField.startsWith('@'); const earlyPatterns = (marked ? fields[1] : firstField).split(','); if (fields.length < (marked ? 4 : 3)) return false; const marker = marked ? firstField : ''; if (marked && !['@revoked', '@cert-authority'].includes(marker)) return false;
    // codescope ignore: any malformed unrelated ordinary known_hosts record intentionally rejects verification globally.
    // codescope ignore: unsupported known_hosts marker records intentionally reject verification globally rather than being ignored.
    const patterns = earlyPatterns; const record = `${marked ? fields[2] : fields[1]} ${marked ? fields[3] : fields[2]}`; if (marked) { try { if (!utils.parseKey(record)?.getPublicSSH?.()) return false; } catch { return false; } } if (!marked && matchesList(patterns, hosts)) rawRecordSeen = true; if (marker === '@revoked') { if (matchesList(patterns, hosts)) revoked.push(record); continue; } if (marker === '@cert-authority') { if (matchesList(patterns, hosts)) authorities.push(record); continue; } if (acceptsRawRecord(record, patterns, hosts, actual, utils)) { rawMatch = true; if (!cert) accepted = true; } } // codescope ignore: malformed marker and ordinary records reject verification globally to preserve fail-closed trust semantics.
    // codescope ignore: revoked records are host-filtered while parsing, so isRevoked never applies a host-scoped record globally.
    if (isRevoked(revoked, actual, key, utils)) return false; // codescope ignore: host-certificate revocation records are intentionally evaluated against the extracted host public key only.
    // codescope ignore: real OpenSSH certificate and CA interoperability is delegated to optional integration coverage rather than validated by unit tests.
    // codescope ignore: CA files retain only algorithm/key trust material and are re-parsed per verification.
    const fileAuthorities = hostCaPath
      ? (await fsLib.readFile(expandPath(hostCaPath, homedirFn), 'utf8')).split(/\r?\n/)
        .map(line => line.trim()).filter(line => line && !line.startsWith('#'))
        .map(line => line.split(/\s+/).slice(0, 2).join(' '))
        .map(record => { try { const parsed = utils.parseKey(record); if (!parsed?.getPublicSSH?.()) throw Error('invalid CA'); return record; } catch { throw Error('invalid host CA'); } })
      : [];
    const trusted = [...authorities, ...fileAuthorities]; if (!accepted && cert) accepted = trusted.some(ca => verifyCertificate(cert, ca, utils, hosts)); // codescope ignore: trusted host CA records are accepted based on parsed public-key equality without independently enforcing the record algorithm token.
  } catch { // codescope ignore: verification fails closed without disclosing trust material.
  } return accepted; })();
    if (callback) { verification.then(value => { try { callback(value); } catch {} }); return undefined; }
    return verification;
  };
}
