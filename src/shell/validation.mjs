import { SshError } from "../errors.mjs";

export function validateShellTimeout(timeout) {
  if (!Number.isFinite(timeout) || timeout < 0)
    throw new SshError("shell timeout must be non-negative", "SSH_INVALID_OPTIONS", undefined, {
      operation: "shell",
      phase: "options",
    });
}

export function validateShellPty({ term, cols, rows }) {
  if (term !== undefined && (typeof term !== "string" || !term.trim()))
    throw new SshError(
      "shell terminal type must be a non-empty string",
      "SSH_INVALID_OPTIONS",
      undefined,
      { operation: "shell", phase: "options" },
    );
  for (const [name, value] of [
    ["cols", cols],
    ["rows", rows],
  ]) {
    if (value !== undefined && (!Number.isInteger(value) || value < 1))
      throw new SshError(
        `shell ${name} must be a positive integer`,
        "SSH_INVALID_OPTIONS",
        undefined,
        { operation: "shell", phase: "options" },
      );
  }
}
