import { parseCertificate } from "../certificate.mjs";

export function normalizePresentedKey(key, utils) {
  const raw = Buffer.from(key);
  let certificate;
  try {
    certificate = parseCertificate(raw);
  } catch {
    certificate = null;
  }
  const actual = utils.parseKey(certificate ? certificate.hostKey : key);
  if (!actual?.getPublicSSH) throw new Error("invalid presented SSH key");
  return { actual, certificate };
}
