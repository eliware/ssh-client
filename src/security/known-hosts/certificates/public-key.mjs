import { encodeString } from "../encoding/encode-string.mjs";

export function extractCertificatePublicKey(base, publicFields) {
  return Buffer.concat([encodeString(Buffer.from(base)), ...publicFields.map(encodeString)]);
}
