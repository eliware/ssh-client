import { expect, test } from '@jest/globals';
import { connect } from '../src/connection.mjs';
test('validates and opens reusable connections', async () => { await expect(connect()).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' }); class C { once(event, fn) { this[event] = fn; return this; } on(event, fn) { this[event] = fn; return this; } emit(event) { this[event]?.(); } connect(options) { this.options = options; this.ready(); } end() { this.close?.(); } shell(cb) { cb(null, { on: (event, fn) => { if (event === 'data') fn('data'); return this; } }); } sftp(cb) { cb(Error('sftp')); } exec(_, cb) { cb(Error('exec')); } } const c = await connect({ host: 'router', privateKey: 'KEY', ClientClass: C }); expect(c.raw.options.privateKey).toBe('KEY'); await expect(c.shell({ onInput: () => {} })).resolves.toBeDefined(); await expect(c.upload('a','b')).rejects.toThrow('sftp'); await expect(c.download('a','b')).rejects.toThrow('sftp'); await expect(c.exec([])).resolves.toEqual([]); await expect(c.exec(['x'])).rejects.toThrow('exec'); c.raw.end(); class C2 { once(event, fn) { if (event === 'ready') fn(); if (event === 'close') fn(); if (event === 'error') fn(Error('connect')); return this; } connect() {} end() {} shell(cb) { cb(Error('shell')); } } const c2 = await connect({ host: 'router', privateKey: 'KEY', password: 'pw', knownHosts: 'router ssh-test key', ClientClass: C2 }); await expect(c2.shell()).rejects.toThrow('shell'); await c2.close(); await expect(connect({ host: 'router', privateKey: 'KEY', connectTimeout: 1, ClientClass: class { once() { return this; } connect() {} end() {} } })).rejects.toMatchObject({ code: 'SSH_TIMEOUT' }); });

test('rejects invalid ports and closes a client that throws during timeout cleanup', async () => {
  await expect(connect({ host: 'router', port: 0 })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  class TimeoutClient {
    once() { return this; }
    connect() {}
    end() { throw new Error('already closed'); }
    destroy() { this.destroyed = true; }
  }
  await expect(connect({ host: 'router', privateKey: 'KEY', connectTimeout: 1, ClientClass: TimeoutClient })).rejects.toMatchObject({ code: 'SSH_TIMEOUT' });
  await expect(connect({ host: 'router', connectTimeout: 0 })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
});
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
});
test('rejects when the transport ends before ready', async () => {
  class EndingClient {
    once(event, fn) { if (event === 'end') queueMicrotask(fn); return this; }
    connect() {}
  }
  await expect(connect({ host: 'router', privateKey: 'KEY', ClientClass: EndingClient })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
});
test('keeps a reusable connection open after successful exec', async () => {
  class ReusableClient {
    once(event, fn) { if (event === 'ready') queueMicrotask(fn); return this; }
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    emit(event) { if (event === 'ready') this.ready?.(); }
    connect() {}
    end() { this.ended = true; }
    exec(_, callback) { callback(null, { on(event, fn) { if (event === 'close') fn(0); return this; }, stderr: { on() { return this; } } }); }
  }
  const client = await connect({ host: 'router', privateKey: 'KEY', ClientClass: ReusableClient });
  await expect(client.exec(['echo ok'])).resolves.toHaveLength(1);
  expect(client.raw.ended).toBeUndefined();
});


