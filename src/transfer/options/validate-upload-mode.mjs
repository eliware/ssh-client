import { SshError } from "../../errors.mjs";

export function validateUploadMode(config) {
  if (
    config.mode !== undefined &&
    (!Number.isInteger(config.mode) || config.mode < 0 || config.mode > 0o7777)
  )
    throw new SshError(
      "upload mode must be a valid permission value",
      "SSH_INVALID_OPTIONS",
      undefined,
      { operation: "upload", phase: "options" },
    );
}
