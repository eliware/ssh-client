import { expect, jest, test } from '@jest/globals';
import { attachCloseEvents } from '../../../../src/connection/lifecycle/client/close-events.mjs';

test('maps close, end, and error events to settlement', () => {
  const handlers = {}; const client = { once: jest.fn((event, handler) => { handlers[event] = handler; }), removeListener: jest.fn(), destroy: jest.fn() }; const finish = jest.fn();
  const detach = attachCloseEvents(client, finish); handlers.close(); handlers.end(); handlers.error('failure'); detach();
  expect(finish).toHaveBeenNthCalledWith(1); expect(finish).toHaveBeenNthCalledWith(2); expect(finish).toHaveBeenNthCalledWith(3, 'failure'); expect(client.destroy).toHaveBeenCalled(); expect(client.removeListener).toHaveBeenCalledTimes(3);
});
