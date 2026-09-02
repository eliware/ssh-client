import { expect, jest, test } from '@jest/globals';
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
