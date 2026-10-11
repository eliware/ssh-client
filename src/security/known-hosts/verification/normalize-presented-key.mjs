import { parseCertificate } from "../certificate.mjs";

export function normalizePresentedKey(key, utils) {
  const raw = Buffer.from(key);
  let certificate;
  try {
    certificate = parseCertificate(raw);
  } catch {
    certificate = null;
  }
  const actual = certificate ? { getPublicSSH: () => certificate.hostKey } : utils.parseKey(key);
  return { actual, certificate };
}
