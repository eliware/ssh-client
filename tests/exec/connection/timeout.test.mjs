import { expect, jest, test } from '@jest/globals';
import { sshExec } from '../../../src/exec/runner/pipeline/execute.mjs';
import { startConnectionTimeout } from '../../../src/exec/connection/timeout.mjs';

test('starts a connection timeout with the requested delay', () => {
  jest.useFakeTimers();
  const callback = jest.fn();
  startConnectionTimeout(25, callback);
  jest.advanceTimersByTime(24);
  expect(callback).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1);
  expect(callback).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
test('times out an SSH connection through the execution pipeline', async () => {
  class ClientMock { on() { return this; } connect() { return this; } end() {} }
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', connectTimeout: 1, ClientClass: ClientMock })).rejects.toMatchObject({ code: 'SSH_TIMEOUT' });
});
