import { expect, jest, test } from '@jest/globals';
import { createCommandQueue } from '../../../../src/exec/runner/pipeline/queue.mjs';
import { sshExec } from '../../../../src/exec/runner/pipeline/execute.mjs';

test('finishes immediately when all commands have been consumed', () => {
  const finish = jest.fn();
  const next = createCommandQueue({ commands: [], finish, isSettled: () => false, isTransportClosed: () => false });
  next();
  expect(finish).toHaveBeenCalledTimes(1);
});
test('cancels after the command has started', async () => {
  class PendingClient {
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() {}
    exec() {}
  }
  const controller = new AbortController();
  const pending = sshExec({ host: 'x', commands: ['x'], password: 'secret', signal: controller.signal, ClientClass: PendingClient });
  await Promise.resolve();
  controller.abort();
  await expect(pending).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
});

test('does not process a queue after settlement or transport closure', () => {
  const finish = jest.fn();
  createCommandQueue({ commands: [], finish, isSettled: () => true, isTransportClosed: () => false })();
  createCommandQueue({ commands: [], finish, isSettled: () => false, isTransportClosed: () => true })();
  expect(finish).not.toHaveBeenCalled();
});
