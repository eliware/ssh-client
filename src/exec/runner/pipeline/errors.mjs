import { SshError } from "../../../errors.mjs";

export const channelError = (error) =>
  new SshError(`SSH exec error: ${error.message || String(error)}`, "SSH_EXEC", error, {
    operation: "exec",
    phase: "channel",
  });
export const commandError = (error) =>
  new SshError(`SSH exec error: ${error.message}`, "SSH_EXEC", error);
export const stderrError = (error) =>
  new SshError(`SSH exec stderr error: ${error.message || String(error)}`, "SSH_EXEC", error, {
    operation: "exec",
    phase: "stderr",
  });
