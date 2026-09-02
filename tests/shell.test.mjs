import { expect, jest, test } from '@jest/globals';
import { openShell } from '../src/shell.mjs';

test('validates shell options and setup failures', async () => {
  await expect(openShell({}, { timeout: -1 })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  const controller = new AbortController(); controller.abort();
  await expect(openShell({ end: jest.fn() }, { signal: controller.signal })).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
  await expect(openShell({ shell: () => { throw Error('boom'); } })).rejects.toMatchObject({ code: 'SSH_SHELL' });
  await expect(openShell({ shell: callback => callback(Error('unavailable')) })).rejects.toMatchObject({ code: 'SSH_SHELL' });
  await expect(openShell({ shell: callback => callback({}) })).rejects.toMatchObject({ code: 'SSH_SHELL' });
  await expect(openShell({ shell: () => { throw 'string failure'; } })).rejects.toMatchObject({ code: 'SSH_SHELL' });
});

test('supports shell streams, completion, close, and input errors', async () => {
  const data = []; let close; let error;
  const stream = {
    on(event, handler) { if (event === 'data') handler('output'); if (event === 'close') close = handler; if (event === 'error') error = handler; return this; },
    once(event, handler) { if (event === 'close') this.closeHandler = handler; if (event === 'error') this.errorHandler = handler; return this; },
    close: jest.fn(), end: jest.fn(),
  };
  const client = { shell: handler => handler(null, stream), end: jest.fn() };
  const session = await openShell(client, { onData: value => data.push(value), onInput: input => input.write?.('x') });
  expect(data).toEqual([Buffer.from('output')]); expect(session.completion).toBeInstanceOf(Promise);
  close?.(0, 'TERM'); stream.closeHandler?.(0, 'TERM'); await expect(session.completion).resolves.toEqual({ code: 0, signal: 'TERM' });
  session.close(); expect(stream.end).toHaveBeenCalled();
  error?.(Error('late')); expect(session).toBeDefined();
});

test('times out setup and handles callback cancellation races', async () => {
  await expect(openShell({ shell: () => {}, end: jest.fn() }, { timeout: 1 })).rejects.toMatchObject({ code: 'SSH_TIMEOUT' });
  let callback;
  const client = { shell: handler => { callback = handler; }, end: jest.fn() };
  const controller = new AbortController();
  const pending = openShell(client, { signal: controller.signal }); controller.abort();
  await expect(pending).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
  const late = { close: jest.fn(), on() { return this; } }; callback(null, late); expect(late.close).toHaveBeenCalled();
});

test('wraps input and early stream failures', async () => {
  const inputFailure = { on() { return this; }, close: jest.fn() };
  await expect(openShell({ shell: callback => callback(null, inputFailure) }, { onInput: () => { throw Error('input'); } })).rejects.toMatchObject({ code: 'SSH_SHELL' });
  const streamFailure = { on(event, handler) { if (event === 'error') handler(Error('stream')); return this; }, close: jest.fn() };
  await expect(openShell({ shell: callback => callback(null, streamFailure) })).rejects.toThrow('stream');
  await expect(openShell({ shell: callback => callback(null, { on() {} }) }, { onInput: () => { throw Error('no close'); } })).rejects.toThrow('input');
  await expect(openShell({ shell: callback => callback(null, { on() {} }) }, { onInput: () => { throw {}; } })).rejects.toMatchObject({ code: 'SSH_SHELL' });
  const minimal = await openShell({ shell: callback => callback(null, { on(event, handler) { if (event === 'data') handler('default'); return this; } }) });
  await expect(minimal.completion).resolves.toEqual({ code: null });
  minimal.close();
  const noCode = { on() { return this; }, once(event, handler) { if (event === 'close') handler(); return this; } };
  const noCodeSession = await openShell({ shell: callback => callback(null, noCode) });
  await expect(noCodeSession.completion).resolves.toEqual({ code: null });
});
test('normalizes post-setup stream errors in completion', async () => {
  let errorHandler;
  const stream = { on() { return this; }, once(event, handler) { if (event === 'error') errorHandler = handler; return this; } };
  const session = await openShell({ shell: callback => callback(null, stream) });
  errorHandler(Error('stream failed'));
  await expect(session.completion).rejects.toMatchObject({ code: 'SSH_SHELL', context: { operation: 'shell', phase: 'stream' } });
});

test('covers shell completion stream error cleanup and settled callbacks', async () => {
  let completionError; let inputError; let closeHandler; let endHandler;
  const stream = {
    on(event, handler) { if (event === 'error') inputError = handler; return this; },
    once(event, handler) { if (event === 'error') completionError = handler; if (event === 'close') closeHandler = handler; if (event === 'end') endHandler = handler; return this; },
    close() { throw Error('already closed'); },
    end() { throw Error('already ended'); },
  };
  const session = await openShell({ shell: callback => callback(null, stream) }, { onData: () => {} });
  completionError(Error('completion failure'));
  await expect(session.completion).rejects.toMatchObject({ code: 'SSH_SHELL' });
  inputError(Error('late failure')); closeHandler?.(0); endHandler?.();
});

test('covers buffer shell data and completion cleanup without closers', async () => {
  let completionError;
  const stream = {
    on(event, handler) { if (event === 'data') handler(Buffer.from('binary')); return this; },
    once(event, handler) { if (event === 'error') completionError = handler; return this; },
  };
  const session = await openShell({ shell: callback => callback(null, stream) });
  completionError(Error('no closers'));
  completionError(Error('duplicate'));
  await expect(session.completion).rejects.toMatchObject({ code: 'SSH_SHELL' });
});

test('covers partial shell cleanup capabilities', async () => {
  let completionError;
  const stream = { on() { return this; }, once(event, handler) { if (event === 'error') completionError = handler; return this; }, close() {} };
  const session = await openShell({ shell: callback => callback(null, stream) });
  completionError(Error('partial cleanup'));
  await expect(session.completion).rejects.toMatchObject({ code: 'SSH_SHELL' });
});
