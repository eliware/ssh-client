import { prepareAuthentication } from "./authentication.mjs";
import { prepareHostVerification } from "./host-verification.mjs";

export async function prepareSecurity(options) {
  const verifier = prepareHostVerification(options);
  const authentication = await prepareAuthentication(options);
  return { ...authentication, verifier, hostVerifier: verifier };
}
