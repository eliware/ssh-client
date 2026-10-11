import { channelError, commandError, stderrError } from "./errors.mjs";

export function handleCommandError(context, error, isCompleted, markCompleted) {
  if (isCompleted()) return;
  markCompleted();
  context.finish(commandError(error));
}

export function handleStderrError(context, error, commandTimer, isCompleted, markCompleted) {
  if (isCompleted()) return;
  markCompleted();
  clearTimeout(commandTimer);
  context.clearActiveTimer(commandTimer);
  context.finish(stderrError(error));
}

export function commandInvocationError(error) {
  return channelError(error);
}
