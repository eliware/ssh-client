import { readString } from "./encoding/read/string.mjs";
import { readUint64 } from "./encoding/read/uint64.mjs";
import { readUint32 } from "./encoding/read/uint32.mjs";
import { readPrincipals } from "./certificates/principals.mjs";
import { validateCertificateOptions } from "./certificates/options.mjs";
import { extractCertificatePublicKey } from "./certificates/public-key.mjs";

const CERT_SUFFIX = "-cert-v01@openssh.com";

export function parseCertificate(key) {
  let offset = 0;
  const type = readString(key, offset);
  offset = type.next;
  const typeText = type.value.toString();
  if (!typeText.endsWith(CERT_SUFFIX)) return null;
  const base = typeText.slice(0, -CERT_SUFFIX.length);
  offset = readString(key, offset).next;
  const publicFields = [];
  if (base === "ssh-ed25519") {
    const field = readString(key, offset);
    offset = field.next;
    publicFields.push(field.value);
  } else if (base === "ssh-rsa") {
    const exponent = readString(key, offset);
    offset = exponent.next;
    const modulus = readString(key, offset);
    offset = modulus.next;
    publicFields.push(exponent.value, modulus.value);
  } else if (base.startsWith("ecdsa-sha2-")) {
    const curve = readString(key, offset);
    offset = curve.next;
    const point = readString(key, offset);
    offset = point.next;
    publicFields.push(curve.value, point.value);
  } else throw new Error(`unsupported host certificate type: ${typeText}`);
  const serial = readUint64(key, offset);
  offset = serial.next;
  const kind = readUint32(key, offset);
  offset = kind.next;
  offset = readString(key, offset).next;
  const principalField = readString(key, offset);
  offset = principalField.next;
  const after = readUint64(key, offset);
  offset = after.next;
  const before = readUint64(key, offset);
  offset = before.next;
  const critical = readString(key, offset);
  offset = critical.next;
  const extensions = readString(key, offset);
  offset = extensions.next;
  offset = readString(key, offset).next;
  validateCertificateOptions(critical.value, extensions.value);
  const signingKey = readString(key, offset);
  offset = signingKey.next;
  const signed = key.subarray(0, offset);
  const signature = readString(key, offset);
  if (signature.next !== key.length || !signingKey.value.length)
    throw new Error("invalid host certificate signature fields");
  return {
    typeText,
    base,
    hostKey: extractCertificatePublicKey(base, publicFields),
    kind: kind.value,
    after: after.value,
    before: before.value,
    principals: readPrincipals(principalField.value),
    signed,
    signingKey: signingKey.value,
    signature: signature.value,
  };
}
