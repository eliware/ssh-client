import { SshError } from "../../errors.mjs";
import { validateUploadMode } from "./validate-upload-mode.mjs";

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
  if (operation === "upload") validateUploadMode(config);
  if (!Number.isFinite(config.timeout ?? 0) || (config.timeout ?? 0) < 0)
    throw new SshError(
      `${operation} timeout must be non-negative`,
      "SSH_INVALID_OPTIONS",
      undefined,
      { operation, phase: "options" },
    );
}
