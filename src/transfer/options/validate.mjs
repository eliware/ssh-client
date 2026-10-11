import { SshError } from "../../errors.mjs";

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
  if (
    config.mode !== undefined &&
    (!Number.isInteger(config.mode) || config.mode < 0 || config.mode > 0o7777)
  )
    throw new SshError(
      "upload mode must be a valid permission mask",
      "SSH_INVALID_OPTIONS",
      undefined,
      { operation, phase: "options" },
    );
  if (!Number.isFinite(config.timeout ?? 0) || (config.timeout ?? 0) < 0)
    throw new SshError(
      `${operation} timeout must be non-negative`,
      "SSH_INVALID_OPTIONS",
      undefined,
      { operation, phase: "options" },
    );
}
