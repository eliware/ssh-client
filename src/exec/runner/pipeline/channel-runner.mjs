import { SshError } from '../../../errors.mjs';
import { buildCommand } from '../../commands/environment/command.mjs';
import { createOutputCollector } from '../../commands/output/collector.mjs';
import { attachChannel } from '../../commands/channel.mjs';
import { createCommandResult } from '../../commands/result.mjs';
import { startCommandTimeout } from '../../commands/timeout.mjs';
import { invokeCommand } from '../../commands/invoke.mjs';
import { channelError, commandError, stderrError } from './errors.mjs';

export function runCommand(context, command, next) {
  const started = Date.now(); let channel; let commandTimer; let completed = false; let timedOut = false;
  const output = createOutputCollector(context.maxOutput, () => channel); context.setCommandStarting(true);
  const done = (error, stream) => {
    context.setCommandStarting(false); if (context.isSettled() || timedOut) { stream?.close?.(); return; }
    if (error) return context.finish(channelError(error));
    channel = stream;
    const state = attachChannel(stream, {
      output,
      onClose: (closeCode, closeSignal) => { context.setCommandStarting(false); Promise.resolve().then(() => { if (completed) return; completed = true; clearTimeout(commandTimer); context.clearActiveTimer(commandTimer); context.results.push(createCommandResult({ command, stdout: output.stdout, stderr: output.stderr, merged: output.merged, maxOutput: context.maxOutput, truncated: output.truncated, exitCode: state.exitCode, closeCode, exitSignal: state.exitSignal, closeSignal, started })); next(); }); },
      onError: error => { if (completed) return; completed = true; clearTimeout(commandTimer); context.finish(commandError(error)); },
      onStderrError: error => { if (completed) return; completed = true; clearTimeout(commandTimer); context.clearActiveTimer(commandTimer); context.finish(stderrError(error)); },
    });
  };
  context.setActiveTimer(commandTimer = startCommandTimeout({ timeout: context.commandTimeout, keepAlive: context.keepAlive, conn: context.conn, getChannel: () => channel, onTimeout: error => { completed = true; timedOut = true; context.finish(error); } }));
  try { invokeCommand(context.conn, buildCommand(command, { cwd: context.cwd, env: context.env, envFallback: context.envFallback }), { env: context.env, envFallback: context.envFallback, pty: context.pty }, done); } catch (error) { clearTimeout(commandTimer); context.finish(new SshError(`SSH exec error: ${error.message}`, 'SSH_EXEC', error)); }
  if (completed) clearTimeout(commandTimer); context.setCommandStarting(false);
}
