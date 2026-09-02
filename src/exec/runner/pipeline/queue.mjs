import { runCommand } from './channel-runner.mjs';

export function createCommandQueue(context) {
  let index = 0;
  return function next() {
    if (context.isSettled() || context.isTransportClosed()) return;
    if (index >= context.commands.length) return context.finish();
    runCommand(context, context.commands[index++], next);
  };
}
