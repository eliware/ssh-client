import { expect, jest, test } from '@jest/globals';
import { createStreamCompletion } from '../../../src/shell/stream/completion.mjs';
test('resolves close once', async () => { const handlers = {}; const stream = { once: (event, fn) => { handlers[event] = fn; }, end: jest.fn() }; const completion = createStreamCompletion(stream, jest.fn()); handlers.close(0, 'SIGTERM'); handlers.end(); await expect(completion).resolves.toEqual({ code: 0, signal: 'SIGTERM' }); });
test('rejects errors and closes', async () => { const stream = { once: (event, fn) => { stream[event] = fn; }, end: jest.fn() }; const close = jest.fn(); const completion = createStreamCompletion(stream, close); stream.error(Error('broken')); await expect(completion).rejects.toMatchObject({ code: 'SSH_SHELL' }); expect(close).toHaveBeenCalled(); });
test('supports streams without once', async () => { await expect(createStreamCompletion({}, jest.fn())).resolves.toEqual({ code: null }); });
