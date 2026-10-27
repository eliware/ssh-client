import { SshError } from "../../errors.mjs";
import { defaultConnectionPort } from "./defaults.mjs";

export function validateConnectionOptions(options, connectTimeout) {
  if (!options.host) throw new SshError("host is required", "SSH_INVALID_OPTIONS");
  const port = defaultConnectionPort(options.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new SshError("TCP endpoint number must be valid", "SSH_INVALID_OPTIONS");
  if (!Number.isFinite(connectTimeout) || connectTimeout <= 0)
    throw new SshError("connectTimeout must be positive", "SSH_INVALID_OPTIONS");
}
