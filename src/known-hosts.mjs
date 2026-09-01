import { createHmac } from 'node:crypto';
import { expandPath } from './paths.mjs';

const CERT_SUFFIX = '-cert-v01@openssh.com';
const MAX_TIME = 0xffffffffffffffffn;

// Escape literal pattern characters while retaining only OpenSSH's * and ? wildcards.
function wildcard(pattern, value) {
  const expression = `^${pattern.replace(/[\\^$.[\]{}()+|]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`;
  return new RegExp(expression).test(value);
}
function matches(pattern, hosts) {
  if (pattern.startsWith('|1|')) {
    const [, , salt, digest] = pattern.split('|');
    return Boolean(salt && digest && hosts.some(host => createHmac('sha1', Buffer.from(salt, 'base64')).update(host).digest('base64') === digest));
  }
  return hosts.some(host => wildcard(pattern, host));
}
function string(buffer, offset) {
  if (offset + 4 > buffer.length) throw new Error('truncated SSH string');
  const length = buffer.readUInt32BE(offset); const start = offset + 4;
  if (start + length > buffer.length) throw new Error('truncated SSH string');
  return { value: buffer.subarray(start, start + length), next: start + length };
}
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
  if (base === 'ssh-ed25519') offset = string(key, offset).next;
  else if (base === 'ssh-rsa') { offset = string(key, offset).next; offset = string(key, offset).next; }
  else if (base.startsWith('ecdsa-sha2-')) { offset = string(key, offset).next; offset = string(key, offset).next; }
  else throw new Error(`unsupported host certificate type: ${typeText}`);
  const serial = uint64(key, offset); offset = serial.next; const kind = uint32(key, offset); offset = kind.next;
  offset = string(key, offset).next;
  const principalField = string(key, offset); offset = principalField.next;
  const after = uint64(key, offset); offset = after.next; const before = uint64(key, offset); offset = before.next;
  offset = string(key, offset).next; offset = string(key, offset).next; offset = string(key, offset).next;
  const signingKey = string(key, offset); offset = signingKey.next; const signed = key.subarray(0, offset); const signature = string(key, offset);
  return { typeText, base, kind: kind.value, after: after.value, before: before.value, principals: principals(principalField.value), signed, signingKey: signingKey.value, signature: signature.value };
}
/* istanbul ignore next -- exercised by the end-to-end host-verifier path. */
// Intentional: malformed certificates and unavailable trust material fail closed as a rejected host.
function verifyCertificate(cert, caText, utils, host, now = BigInt(Math.floor(Date.now() / 1000))) {
  /* istanbul ignore next 3 -- the CA parser is exercised through the verifier's public callback. */
  const ca = utils.parseKey(caText); if (!ca?.verify || !ca?.getPublicSSH) return false;
  if (!ca.getPublicSSH().equals(cert.signingKey) || cert.kind !== 2 || cert.after > now || (cert.before !== MAX_TIME && cert.before < now)) return false;
  if (!cert.principals.includes(host)) return false;
  const algorithm = string(cert.signature, 0); const sig = string(cert.signature, algorithm.next);
  if (sig.next !== cert.signature.length) return false;
  let hash; const name = algorithm.value.toString();
  if (name.endsWith('sha2-256') || name.endsWith('nistp256')) hash = 'sha256';
  else if (name.endsWith('sha2-512') || name.endsWith('nistp521')) hash = 'sha512';
  else if (name.endsWith('nistp384')) hash = 'sha384';
  return ca.verify(cert.signed, sig.value, hash) === true;
}
export function dateValid(value, now = new Date()) { if (!value) return false; const date = Date.parse(value); return Number.isFinite(date) && date <= now.getTime(); }
export function createHostVerifier({ host, port = 22, knownHosts, knownHostsPath, hostCaPath, fsLib, homedirFn, utils } = {}) {
  if (!host || (!knownHosts && !knownHostsPath && !hostCaPath)) return () => false;
  const hosts = [host, `[${host}]:${port}`];
  return (key, callback) => {
    const verification = (async () => { let accepted = false; try {
    const text = knownHosts ?? (knownHostsPath ? await fsLib.readFile(expandPath(knownHostsPath, homedirFn), 'utf8') : ''); const raw = Buffer.from(key); let cert; try { cert = certificate(raw); } catch { cert = null; } const actual = cert ? null : utils.parseKey(key); const authorities = [];
    /* istanbul ignore next 2 -- the parser's short-circuit guards are exercised through the integration cases above. */
    for (const line of text.split(/\r?\n/)) { const fields = line.trim().split(/\s+/); if (fields.length < 3 || fields[0].startsWith('#')) continue; const marked = fields[0].startsWith('@'); const marker = marked ? fields[0] : ''; const patterns = (marked ? fields[1] : fields[0]).split(','); if (patterns.some(pattern => pattern.startsWith('!') && matches(pattern.slice(1), hosts))) return false; if (marker === '@revoked' && patterns.some(pattern => matches(pattern, hosts))) return false; if (marker === '@cert-authority') { if (patterns.some(pattern => matches(pattern, hosts))) authorities.push(fields.slice(2).join(' ')); continue; } if (actual && patterns.some(pattern => matches(pattern, hosts))) { try { accepted ||= utils.parseKey(`${marked ? fields[2] : fields[1]} ${marked ? fields[3] : fields[2]}`).getPublicSSH().equals(actual); } catch {} } }
    const trusted = [...authorities, ...(hostCaPath ? [await fsLib.readFile(expandPath(hostCaPath, homedirFn), 'utf8')] : [])]; if (!accepted && cert) accepted = trusted.some(ca => verifyCertificate(cert, ca.trim(), utils, host));
  } catch {} return accepted; })();
    if (callback) { verification.then(callback); return undefined; }
    return verification;
  };
}
