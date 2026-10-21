import { buildCommand } from "../../commands/environment/command.mjs";
import { createOutputCollector } from "../../commands/output/collector.mjs";
import { invokeCommand } from "../../commands/invoke.mjs";
import { createCommandCallback } from "./command/callback.mjs";

export function runCommand(context, command, next) {
  const started = Date.now();
  const channel = { value: undefined };
  const output = createOutputCollector(context.maxOutput, () => channel.value);
  context.setCommandStarting(true);
  const callback = createCommandCallback({ context, command, output, started, next, channel });
  try {
    invokeCommand(
      context.conn,
      buildCommand(command, {
        cwd: context.cwd,
        env: context.env,
        envFallback: context.envFallback,
      }),
      { env: context.env, envFallback: context.envFallback, pty: context.pty },
      callback.done,
    );
  } catch (error) {
    callback.fail(error);
  }
  callback.finishInvocation();
}
