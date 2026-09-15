import { expect, jest, test } from '@jest/globals';
import { connectionError } from '../../../src/exec/connection/errors.mjs';
import { sshExec } from '../../../src/exec/runner/pipeline/execute.mjs';

test('maps transport error levels to SSH error codes', () => {
  expect(connectionError({ level: 'client-authentication', message: 'failed' })).toMatchObject({ code: 'SSH_AUTHENTICATION' });
  expect(connectionError({ level: 'client-timeout', message: 'failed' })).toMatchObject({ code: 'SSH_TIMEOUT' });
  expect(connectionError({ message: 'failed' })).toMatchObject({ code: 'SSH_CONNECTION' });
  expect(connectionError({})).toMatchObject({ code: 'SSH_CONNECTION' });
});
test('covers connection errors and cleanup failures through execution', async () => {
  class FailingClient { on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; return this; } connect() { this.handlers.ready(); } end() {} exec() { throw {}; } }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', ClientClass: FailingClient })).rejects.toMatchObject({ code: 'SSH_EXEC' });
  class ErrorClient { on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; return this; } connect() { this.handlers.error({ level: 'other' }); } end() {} }
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', ClientClass: ErrorClient })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
  class CleanupClient { constructor() { this.destroy = jest.fn(); } on(event, handler) { if (event === 'ready') this.ready = handler; return this; } connect() { this.ready(); } end() { throw Error('already closed'); } }
  const client = new CleanupClient();
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', ClientClass: class extends CleanupClient { constructor() { super(); client.destroy = this.destroy; } } })).resolves.toEqual([]);
  expect(client.destroy).toHaveBeenCalled();
});
