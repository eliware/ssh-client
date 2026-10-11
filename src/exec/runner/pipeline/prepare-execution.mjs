import { SshError } from "../../../errors.mjs";
import { prepareExecution } from "./options.mjs";

export async function prepareExecutionWithCancellation(options) {
  if (options.signal?.aborted)
    throw new SshError("SSH operation cancelled", "SSH_CANCELLED", undefined, {
      operation: "exec",
      phase: "options",
    });
  let earlyAborted = false;
  const earlyAbort = () => {
    earlyAborted = true;
  };
  options.signal?.addEventListener("abort", earlyAbort, { once: true });
  const config = await prepareExecution(options);
  options.signal?.removeEventListener("abort", earlyAbort);
  if (earlyAborted)
    throw new SshError("SSH operation cancelled", "SSH_CANCELLED", undefined, {
      operation: "exec",
      phase: "options",
    });
  return config;
}
