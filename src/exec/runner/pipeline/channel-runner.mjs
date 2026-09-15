import { SshError } from '../../../errors.mjs';
import { buildCommand } from '../../commands/environment/command.mjs';
import { createOutputCollector } from '../../commands/output/collector.mjs';
import { startCommandTimeout } from '../../commands/timeout.mjs';
import { invokeCommand } from '../../commands/invoke.mjs';
import { attachCommandChannel, commandInvocationError } from './command-channel.mjs';

export function runCommand(context, command, next) {
  const started = Date.now(); let channel; let commandTimer; let completed = false; let timedOut = false;
  const output = createOutputCollector(context.maxOutput, () => channel); context.setCommandStarting(true);
  const done = (error, stream) => {
    context.setCommandStarting(false); if (context.isSettled() || timedOut) { stream?.close?.(); return; }
    if (error) return context.finish(commandInvocationError(error));
    channel = stream;
    attachCommandChannel({ stream, output, context, command, started, commandTimer, isCompleted: () => completed, markCompleted: () => { completed = true; }, next });
  };
  context.setActiveTimer(commandTimer = startCommandTimeout({ timeout: context.commandTimeout, keepAlive: context.keepAlive, conn: context.conn, getChannel: () => channel, onTimeout: error => { completed = true; timedOut = true; context.finish(error); } }));
  try { invokeCommand(context.conn, buildCommand(command, { cwd: context.cwd, env: context.env, envFallback: context.envFallback }), { env: context.env, envFallback: context.envFallback, pty: context.pty }, done); } catch (error) { clearTimeout(commandTimer); context.finish(new SshError(`SSH exec error: ${error.message}`, 'SSH_EXEC', error)); }
  if (completed) clearTimeout(commandTimer); context.setCommandStarting(false);
}
