import { startCommandTimeout } from "../../../commands/timeout.mjs";
import { attachCommandChannel } from "./channel.mjs";
import { commandInvocationError } from "./errors.mjs";

export function createCommandCallback({
  context,
  command,
  output,
  started,
  next,
  channel = { value: undefined },
}) {
  let completed = false;
  let timedOut = false;
  const commandTimer = startCommandTimeout({
    timeout: context.commandTimeout,
    keepAlive: context.keepAlive,
    conn: context.conn,
    getChannel: () => channel.value,
    onTimeout: (error) => {
      completed = true;
      timedOut = true;
      context.finish(error);
    },
  });
  context.setActiveTimer(commandTimer);
  const done = (error, stream) => {
    context.setCommandStarting(false);
    if (context.isSettled() || timedOut) {
      stream?.close?.();
      return;
    }
    if (error) return context.finish(commandInvocationError(error));
    channel.value = stream;
    attachCommandChannel({
      stream,
      output,
      context,
      command,
      started,
      commandTimer,
      isCompleted: () => completed,
      markCompleted: () => {
        completed = true;
      },
      next,
    });
  };
  return {
    done,
    finishInvocation() {
      if (completed) clearTimeout(commandTimer);
      context.setCommandStarting(false);
    },
    fail(error) {
      clearTimeout(commandTimer);
      context.finish(commandInvocationError(error));
    },
  };
}
