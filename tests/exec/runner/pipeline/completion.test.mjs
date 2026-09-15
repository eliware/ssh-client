import { expect, jest, test } from '@jest/globals';
import { completeExecution } from '../../../../src/exec/runner/pipeline/completion.mjs';

test('rejects and ends an unfinished transport on error', () => {
  const reject = jest.fn(); const end = jest.fn();
  completeExecution({ error: Error('failed'), state: { ended: false, transportClosed: false }, conn: { end }, keepAlive: false, results: [], resolve: jest.fn(), reject });
  expect(end).toHaveBeenCalled();
  expect(reject).toHaveBeenCalled();
});

test('resolves results and closes a successful transport', () => {
  const resolve = jest.fn(); const end = jest.fn();
  completeExecution({ state: { ended: false, transportClosed: false }, conn: { end }, keepAlive: false, results: ['ok'], resolve, reject: jest.fn() });
  expect(end).toHaveBeenCalled();
  expect(resolve).toHaveBeenCalledWith(['ok']);
});
