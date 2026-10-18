import { SshError } from "../../errors.mjs";

export function transferSetupError(operation, error, handle) {
  return new SshError(
    `${operation} setup failed: ${error?.message || (error ? String(error) : "missing SFTP session")}`,
    "SSH_SFTP",
    error,
    { operation, phase: "setup", handle },
  );
}

export function normalizeTransferError(operation, error) {
  if (error instanceof SshError) return error;
  return new SshError(
    `${operation} failed: ${error?.message || String(error)}`,
    "SSH_TRANSFER",
    error,
    { operation, phase: "transfer" },
  );
}

export function cancellationError(operation) {
  return new SshError(`${operation} cancelled`, "SSH_CANCELLED", undefined, {
    operation,
    phase: "transfer",
  });
}

export function timeoutError(operation) {
  return new SshError(`${operation} timed out`, "SSH_TIMEOUT", undefined, {
    operation,
    phase: "transfer",
  });
}
