import { SshError } from "../../errors.mjs";
import { validateTransferOperation } from "./operation.mjs";

export function validateTransferOptions(config, operation, fields) {
  if (
    !config ||
    typeof config !== "object" ||
    Array.isArray(config) ||
    fields.some((field) => typeof config[field] !== "string" || !config[field])
  )
    throw new SshError(
      `${operation} requires an options object with localPath and remotePath`,
      "SSH_INVALID_OPTIONS",
      undefined,
      { operation, phase: "options" },
    );
  validateTransferOperation(config, operation);
  if (!Number.isFinite(config.timeout ?? 0) || (config.timeout ?? 0) < 0)
    throw new SshError(
      `${operation} timeout must be non-negative`,
      "SSH_INVALID_OPTIONS",
      undefined,
      { operation, phase: "options" },
    );
}
