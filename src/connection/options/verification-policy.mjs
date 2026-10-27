import { SshError } from "../../errors.mjs";

export function validateHostVerificationPolicy({
  hostVerifier,
  knownHosts,
  knownHostsPath,
  hostCaPath,
  requireVerification,
  clientIsDefault,
}) {
  if (hostVerifier !== undefined && typeof hostVerifier !== "function")
    throw new SshError("hostVerifier must be a function", "SSH_INVALID_OPTIONS");
  if (
    clientIsDefault &&
    requireVerification &&
    !hostVerifier &&
    !knownHosts &&
    !knownHostsPath &&
    !hostCaPath
  )
    throw new SshError("host verification configuration is required", "SSH_INVALID_OPTIONS");
}
