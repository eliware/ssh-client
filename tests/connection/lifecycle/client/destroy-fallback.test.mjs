import { expect, jest, test } from '@jest/globals';
import { safelyDestroy, scheduleDestroyFallback } from '../../../../src/connection/lifecycle/client/destroy-fallback.mjs';

test('safely destroys transports even when destroy throws', () => {
  const client = { destroy: jest.fn(() => { throw Error('gone'); }) };
  expect(() => safelyDestroy(client)).not.toThrow();
  expect(client.destroy).toHaveBeenCalled();
});

test('schedules fallback destruction and completion', () => {
  jest.useFakeTimers(); const client = { destroy: jest.fn() }; const finish = jest.fn();
  scheduleDestroyFallback(client, finish, 10); jest.advanceTimersByTime(10);
  expect(client.destroy).toHaveBeenCalled(); expect(finish).toHaveBeenCalled(); jest.useRealTimers();
});
