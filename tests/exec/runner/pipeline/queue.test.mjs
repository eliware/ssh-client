import { expect, jest, test } from '@jest/globals';
import { createCommandQueue } from '../../../../src/exec/runner/pipeline/queue.mjs';

test('finishes immediately when all commands have been consumed', () => {
  const finish = jest.fn();
  const next = createCommandQueue({ commands: [], finish, isSettled: () => false, isTransportClosed: () => false });
  next();
  expect(finish).toHaveBeenCalledTimes(1);
});

test('does not process a queue after settlement or transport closure', () => {
  const finish = jest.fn();
  createCommandQueue({ commands: [], finish, isSettled: () => true, isTransportClosed: () => false })();
  createCommandQueue({ commands: [], finish, isSettled: () => false, isTransportClosed: () => true })();
  expect(finish).not.toHaveBeenCalled();
});
