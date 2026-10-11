import { attachChannel } from "../../commands/channel.mjs";
import { handleCommandClose } from "./command-close.mjs";
import {
  handleCommandError,
  handleStderrError,
  commandInvocationError,
} from "./command-errors.mjs";

export function attachCommandChannel({
  stream,
  output,
  context,
  command,
  started,
  commandTimer,
  isCompleted,
  markCompleted,
  next,
}) {
  const state = attachChannel(stream, {
    output,
    onClose: (closeCode, closeSignal) =>
      handleCommandClose({
        context,
        output,
        command,
        started,
        getState: () => state,
        closeCode,
        closeSignal,
        commandTimer,
        isCompleted,
        markCompleted,
        next,
      }),
    onError: (error) => handleCommandError(context, error, isCompleted, markCompleted),
    onStderrError: (error) =>
      handleStderrError(context, error, commandTimer, isCompleted, markCompleted),
  });
  return state;
}

export { commandInvocationError };
