import { expect, test } from '@jest/globals';
import { connect } from '../../../../src/connection/lifecycle/client/connect.mjs';

test('close resolves when the transport throws synchronously', async () => {
  class ClosingClient {
    once(event, fn) { if (event === 'ready') queueMicrotask(fn); return this; }
    connect() {}
    end() { throw new Error('already closed'); }
    destroy() {}
  }
  const client = await connect({ host: 'router', privateKey: 'KEY', ClientClass: ClosingClient });
  await expect(client.close()).resolves.toBeUndefined();
  await expect(client.close()).resolves.toBeUndefined();
  await expect(client.exec([])).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
  await expect(client.shell()).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
  await expect(client.upload({ localPath: 'a', remotePath: 'b' })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
  await expect(client.download({ remotePath: 'a', localPath: 'b' })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
});

test('rejects close when the transport emits a shutdown error', async () => {
  class ErrorOnClose {
    once(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; if (event === 'ready') queueMicrotask(fn); return this; }
    connect() {}
    end() { this.handlers.error(Error('shutdown')); }
  }
  const client = await connect({ host: 'router', privateKey: 'KEY', ClientClass: ErrorOnClose });
  await expect(client.close()).rejects.toMatchObject({ code: 'SSH_CONNECTION', context: { operation: 'close', phase: 'cleanup' } });
});

test('forces close fallback when destroy is unavailable', async () => {
  class StuckClient { once(event, callback) { if (event === 'ready') queueMicrotask(callback); return this; } connect() {} end() {} }
  const client = await connect({ host: 'router', privateKey: 'KEY', ClientClass: StuckClient });
  await expect(client.close()).resolves.toBeUndefined();
  expect(client.state).toBe('closed');
});

test('settles close when the transport emits end only', async () => {
  class EndingClient { once(event, callback) { if (event === 'ready') queueMicrotask(callback); if (event === 'end') this.endCallback = callback; return this; } connect() {} end() { this.endCallback(); } }
  const client = await connect({ host: 'router', username: 'user', privateKey: 'KEY', ClientClass: EndingClient });
  await expect(client.close()).resolves.toBeUndefined();
});
