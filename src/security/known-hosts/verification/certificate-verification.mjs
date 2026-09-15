import { readString } from '../encoding/read-string.mjs';

const MAX_TIME = 0xffffffffffffffffn;
export function verifyCertificate(cert, caText, utils, hosts, now = BigInt(Math.floor(Date.now() / 1000))) {
  const ca = utils.parseKey(caText); if (!ca?.verify || !ca?.getPublicSSH) return false;
  if (!ca.getPublicSSH().equals(cert.signingKey) || cert.kind !== 2 || cert.after > now || (cert.before !== MAX_TIME && cert.before <= now)) return false;
  if (!hosts.some(host => cert.principals.includes(host))) return false;
  const algorithm = readString(cert.signature, 0); const signature = readString(cert.signature, algorithm.next); if (signature.next !== cert.signature.length) return false;
  const name = algorithm.value.toString(); const ecdsaHash = { 'ecdsa-sha2-nistp256': 'sha256', 'ecdsa-sha2-nistp384': 'sha384', 'ecdsa-sha2-nistp521': 'sha512' };
  if (name.startsWith('rsa-sha2-') && cert.base !== 'ssh-rsa') return false;
  if (name.startsWith('ecdsa-sha2-') && !name.endsWith(cert.base.slice('ecdsa-sha2-'.length))) return false;
  const hash = name.startsWith('ecdsa-sha2-') ? ecdsaHash[name] : name === 'rsa-sha2-256' ? 'sha256' : name === 'rsa-sha2-512' ? 'sha512' : undefined;
  if (name !== 'ssh-ed25519' && !hash) return false;
  return ca.verify(cert.signed, signature.value, hash) === true;
}
