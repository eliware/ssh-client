import { expect, jest, test } from '@jest/globals';
import { createOperationQueue } from '../../../src/connection/reusable/operation-queue.mjs';

test('serializes operations after success and failure', async () => {
  const queue = createOperationQueue();
  const order = [];
  const first = queue(async () => { order.push('first'); return 1; });
  const second = queue(async () => { order.push('second'); return 2; });
  expect(await Promise.all([first, second])).toEqual([1, 2]);
  await expect(queue(() => { throw Error('failed'); })).rejects.toThrow('failed');
  await queue(() => { order.push('after-failure'); });
  expect(order).toEqual(['first', 'second', 'after-failure']);
  expect(jest.isMockFunction(queue)).toBe(false);
});
