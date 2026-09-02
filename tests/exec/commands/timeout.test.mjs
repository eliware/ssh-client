import { expect, jest, test } from '@jest/globals';
import { startCommandTimeout } from '../../../src/exec/commands/timeout.mjs';

test('reports command timeout and closes the channel', () => {
  jest.useFakeTimers();
  const onTimeout = jest.fn(); const close = jest.fn(); const end = jest.fn();
  startCommandTimeout({ timeout: 10, keepAlive: false, conn: { end }, getChannel: () => ({ close }), onTimeout });
  jest.advanceTimersByTime(10);
  expect(onTimeout).toHaveBeenCalledWith(expect.objectContaining({ code: 'SSH_COMMAND_TIMEOUT' }));
  expect(close).toHaveBeenCalled(); expect(end).not.toHaveBeenCalled();
  jest.useRealTimers();
});

test('ends a reusable connection after command timeout', () => {
  jest.useFakeTimers();
  const end = jest.fn(); const close = jest.fn();
  startCommandTimeout({ timeout: 1, keepAlive: true, conn: { end }, getChannel: () => ({ close }), onTimeout: jest.fn() });
  jest.advanceTimersByTime(1);
  expect(end).toHaveBeenCalled(); expect(close).toHaveBeenCalled();
  jest.useRealTimers();
});
