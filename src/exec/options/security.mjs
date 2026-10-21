import { SshError } from "../../errors.mjs";
import { prepareConnectionSecurity } from "../../connection/options/prepare-connection-security.mjs";

export async function prepareExecutionSecurity(options, defaultClient) {
  try {
    return await prepareConnectionSecurity(options, defaultClient);
  } catch (error) {
    throw new SshError(error.message, "SSH_INVALID_OPTIONS", error);
  }
}
