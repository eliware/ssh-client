import { SshError } from "../../errors.mjs";

export function startCommandTimeout({ timeout, keepAlive, conn, getChannel, onTimeout }) {
  if (timeout <= 0) return undefined;
  return setTimeout(() => {
    onTimeout(
      new SshError("SSH command timed out", "SSH_COMMAND_TIMEOUT", undefined, {
        operation: "exec",
        phase: "command",
      }),
    );
    getChannel()?.close?.();
    if (keepAlive) {
      try {
        conn.end();
      } catch {
        conn.destroy?.();
      }
    }
  }, timeout);
}
