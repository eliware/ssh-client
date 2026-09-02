import { expect, jest, test } from '@jest/globals';
import { attachConnectionEvents } from '../../../src/exec/connection/events.mjs';

test('attaches ready, error, end, and close handlers', () => {
  const calls = [];
  const client = { on(event, handler) { calls.push([event, handler]); return this; } };
  const handlers = { onReady: jest.fn(), onError: jest.fn(), onClosed: jest.fn() };
  expect(attachConnectionEvents(client, handlers)).toBe(client);
  expect(calls.map(([event]) => event)).toEqual(['ready', 'error', 'end', 'close']);
  expect(calls[0][1]).toBe(handlers.onReady);
  expect(calls[1][1]).toBe(handlers.onError);
  expect(calls[2][1]).toBe(handlers.onClosed);
  expect(calls[3][1]).toBe(handlers.onClosed);
});
