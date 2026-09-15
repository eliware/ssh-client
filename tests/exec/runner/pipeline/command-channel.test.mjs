import { expect, test } from '@jest/globals';
import { attachCommandChannel, commandInvocationError } from '../../../../src/exec/runner/pipeline/command-channel.mjs';

test('normalizes command invocation errors', () => { expect(commandInvocationError(Error('channel'))).toMatchObject({ code: 'SSH_EXEC' }); });

test('attaches a channel and records a completed result', async () => {
  let close; const stream = { on(event, handler) { if (event === 'close') close = handler; if (event === 'exit') handler(0); return this; }, stderr: { on() { return this; } } };
  const output = { stdout: 'out', stderr: '', merged: 'out', truncated: false };
  const context = { maxOutput: 100, results: [], setCommandStarting() {}, clearActiveTimer() {}, finish: () => { throw Error('unexpected'); } };
  let completed = false; attachCommandChannel({ stream, output, context, command: 'echo', started: Date.now(), commandTimer: undefined, isCompleted: () => completed, markCompleted: () => { completed = true; }, next: () => {} }); close(0); await Promise.resolve(); expect(context.results).toHaveLength(1); expect(context.results[0].code).toBe(0);
});
