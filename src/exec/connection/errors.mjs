import { SshError } from "../../errors.mjs";

export function connectionError(error) {
  const code =
    error?.level === "client-authentication"
      ? "SSH_AUTHENTICATION"
      : error?.level === "client-timeout"
        ? "SSH_TIMEOUT"
        : "SSH_CONNECTION";
  const message =
    code === "SSH_AUTHENTICATION"
      ? "authentication failed"
      : code === "SSH_TIMEOUT"
        ? "connection timed out"
        : "connection error";
  return new SshError(
    `SSH ${message}: ${error?.message || "unknown transport error"}`,
    code,
    error,
  );
}
