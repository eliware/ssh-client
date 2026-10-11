import { createCommandResult } from "../../commands/result.mjs";

export function handleCommandClose({
  context,
  output,
  command,
  started,
  getState,
  closeCode,
  closeSignal,
  commandTimer,
  isCompleted,
  markCompleted,
  next,
}) {
  context.setCommandStarting(false);
  Promise.resolve().then(() => {
    if (isCompleted()) return;
    markCompleted();
    clearTimeout(commandTimer);
    context.clearActiveTimer(commandTimer);
    const state = getState();
    context.results.push(
      createCommandResult({
        command,
        stdout: output.stdout,
        stderr: output.stderr,
        merged: output.merged,
        maxOutput: context.maxOutput,
        truncated: output.truncated,
        exitCode: state.exitCode,
        closeCode,
        exitSignal: state.exitSignal,
        closeSignal,
        started,
      }),
    );
    next();
  });
}
