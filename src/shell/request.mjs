import { SshError } from "../errors.mjs";

export function requestShell(client, ptyOptions, onResult, onError) {
  try {
    if (ptyOptions) client.shell(ptyOptions, onResult);
    else client.shell(onResult);
  } catch (cause) {
    onError(
      new SshError(`SSH shell error: ${cause.message || String(cause)}`, "SSH_SHELL", cause, {
        operation: "shell",
        phase: "setup",
      }),
    );
  }
}
