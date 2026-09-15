import { expect, jest, test } from '@jest/globals';
import { createExecutionConnectionEvents } from '../../../../src/exec/runner/pipeline/connection-events.mjs';

test('normalizes connection errors and closes during command setup', async () => {
  const finish = jest.fn(); const state = { closed: false, deferred: false }; const events = createExecutionConnectionEvents({ getConn: () => ({ end: jest.fn() }), finish, isEnded: () => false, isSettled: () => false, setTransportClosed: value => { state.closed = value; }, isCommandStarting: () => true, isCloseDeferred: () => state.deferred, deferClose: () => { state.deferred = true; } });
  events.onError(Error('network')); expect(finish).toHaveBeenCalledWith(expect.objectContaining({ code: 'SSH_CONNECTION' })); events.onClosed(); expect(state.closed).toBe(true); await new Promise(resolve => setImmediate(resolve)); expect(finish).toHaveBeenCalledWith(expect.objectContaining({ code: 'SSH_CONNECTION' }));
});

test('ends an unexpectedly closed idle connection', () => { const finish = jest.fn(); const end = jest.fn(); const events = createExecutionConnectionEvents({ getConn: () => ({ end }), finish, isEnded: () => false, isSettled: () => false, setTransportClosed: jest.fn(), isCommandStarting: () => false, isCloseDeferred: () => false, deferClose: jest.fn() }); events.onClosed(); expect(end).toHaveBeenCalled(); expect(finish).toHaveBeenCalled(); });
