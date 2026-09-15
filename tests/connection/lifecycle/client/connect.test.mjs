import { expect, test } from '@jest/globals';
import { connect } from '../../../../src/connection/lifecycle/client/connect.mjs';

test('connect validates missing host and falls back to USERNAME', async () => {
  await expect(connect()).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  const user = process.env.USER;
  const username = process.env.USERNAME;
  delete process.env.USER;
  process.env.USERNAME = 'test-user';
  try {
    await expect(connect()).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  } finally {
    if (user === undefined) delete process.env.USER;
    else process.env.USER = user;
    if (username === undefined) delete process.env.USERNAME;
    else process.env.USERNAME = username;
  }
});

test('validates and opens reusable connections', async () => { await expect(connect()).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' }); class C { once(event, fn) { this[event] = fn; return this; } on(event, fn) { this[event] = fn; return this; } emit(event) { this[event]?.(); } connect() { this.ready(); } end() { this.close?.(); } shell(cb) { cb(null, { on: (event, fn) => { if (event === 'data') fn('data'); return this; } }); } sftp(cb) { cb(Error('sftp')); } exec(_, cb) { cb(Error('exec')); } } const c = await connect({ host: 'router', privateKey: 'KEY', ClientClass: C }); expect(c.state).toBe('open'); await expect(c.shell({ onInput: () => {} })).resolves.toBeDefined(); await expect(c.upload({ localPath: 'a', remotePath: 'b' })).rejects.toThrow('sftp'); await expect(c.download({ remotePath: 'a', localPath: 'b' })).rejects.toThrow('sftp'); await expect(c.exec([])).resolves.toEqual([]); await expect(c.exec(['x'])).rejects.toThrow('exec'); await c.close(); expect(c.state).toBe('closed'); class C2 { once(event, fn) { if (event === 'ready') fn(); if (event === 'close') fn(); if (event === 'error') fn(Error('connect')); return this; } connect() {} end() {} shell(cb) { cb(Error('shell')); } } const c2 = await connect({ host: 'router', privateKey: 'KEY', password: 'pw', knownHosts: 'router ssh-test key', ClientClass: C2 }); await expect(c2.shell()).rejects.toThrow('shell'); await c2.close(); await expect(connect({ host: 'router', privateKey: 'KEY', connectTimeout: 1, ClientClass: class { once() { return this; } connect() {} end() {} } })).rejects.toMatchObject({ code: 'SSH_TIMEOUT' }); });
test('cancels shell setup before a delayed callback', async () => {
  let shellCallback;
  class Delayed {
    once(event, fn) { if (event === 'ready') fn(); return this; }
    on() { return this; }
    connect() {}
    end() {}
    shell(callback) { shellCallback = callback; }
  }
  const controller = new AbortController();
  const client = await connect({ host: 'router', privateKey: 'KEY', ClientClass: Delayed });
  const pending = client.shell({ signal: controller.signal });
  controller.abort();
  await expect(pending).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
  let closed = 0;
  const stream = { close: () => { closed += 1; } };
  shellCallback(null, stream);
  expect(closed).toBe(1);
});
test('wraps shell setup errors with operation context', async () => {
  class ErrorShell {
    once(event, fn) { if (event === 'ready') fn(); return this; }
    on() { return this; }
    connect() {}
    end() {}
    shell(callback) { callback('shell unavailable'); }
  }
  const client = await connect({ host: 'router', privateKey: 'KEY', ClientClass: ErrorShell });
  await expect(client.shell()).rejects.toMatchObject({ code: 'SSH_SHELL', context: { operation: 'shell', phase: 'setup' } });
});
test('wraps synchronous shell transport failures', async () => {
  class BrokenShell {
    once(event, fn) { if (event === 'ready') fn(); return this; }
    on() { return this; }
    connect() {}
    end() {}
    shell() { throw 'shell throw'; }
  }
  const client = await connect({ host: 'router', privateKey: 'KEY', ClientClass: BrokenShell });
  await expect(client.shell()).rejects.toMatchObject({ code: 'SSH_SHELL' });
});
test('times out shell setup and supports minimal streams', async () => {
  class TimeoutShell {
    once(event, fn) { if (event === 'ready') fn(); return this; }
    on() { return this; }
    connect() {}
    end() {}
    shell() {}
  }
  const client = await connect({ host: 'router', privateKey: 'KEY', ClientClass: TimeoutShell });
  await expect(client.shell({ timeout: 1 })).rejects.toMatchObject({ code: 'SSH_TIMEOUT' });
  class MinimalShell extends TimeoutShell { shell(callback) { callback(null, { on() { return this; } }); } }
  const minimal = await connect({ host: 'router', privateKey: 'KEY', ClientClass: MinimalShell });
  const stream = await minimal.shell();
  await expect(stream.completion).resolves.toEqual({ code: null });
  stream.close();
  await minimal.close();
});
test('handles pre-aborted shell and explicit key path authentication', async () => {
  class ReadyClient {
    once(event, fn) { if (event === 'ready') fn(); return this; }
    on() { return this; }
    connect() {}
    end() {}
    shell() {}
  }
  const controller = new AbortController();
  controller.abort();
  const client = await connect({ host: 'router', privateKeyPath: '/tmp/key', password: 'pw', ClientClass: ReadyClient, fsLib: { readFile: async () => 'KEY' } });
  await expect(client.shell({ signal: controller.signal })).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
  await connect({ host: 'router', password: null, ClientClass: ReadyClient, fsLib: { readFile: async () => 'KEY' } });
});
test('normalizes shell completion without an exit code', async () => {
  class NullCompletion {
    once(event, fn) { if (event === 'ready') fn(); return this; }
    on() { return this; }
    connect() {}
    end() {}
    shell(callback) { callback(null, { on() { return this; }, once(event, fn) { if (event === 'close') fn(); return this; }, close() {}, end() {} }); }
  }
  const client = await connect({ host: 'router', privateKey: 'KEY', ClientClass: NullCompletion });
  await expect((await client.shell()).completion).resolves.toMatchObject({ code: null });
});
test('closes a client that throws during timeout cleanup', async () => {
  class TimeoutClient {
    once() { return this; }
    connect() {}
    end() { throw new Error('already closed'); }
    destroy() { this.destroyed = true; }
  }
  await expect(connect({ host: 'router', privateKey: 'KEY', connectTimeout: 1, ClientClass: TimeoutClient })).rejects.toMatchObject({ code: 'SSH_TIMEOUT' });
});
test('rejects shell setup when its stream fails or closes', async () => {
  for (const event of ['error', 'close']) {
    class ShellClient {
      once(name, fn) { if (name === 'ready') queueMicrotask(fn); return this; }
      on() { return this; }
      connect() {}
      shell(callback) { callback(null, { on(name, fn) { if (name === event) fn(Error('shell stream')); return this; } }); }
    }
    const client = await connect({ host: 'router', privateKey: 'KEY', ClientClass: ShellClient });
    if (event === 'error') await expect(client.shell()).rejects.toThrow('shell');
    else await expect(client.shell()).resolves.toBeDefined();
  }
});
test('keeps shell resolution stable when the stream closes afterward', async () => {
  class ShellClient {
    once(event, fn) { if (event === 'ready') queueMicrotask(fn); return this; }
    on() { return this; }
    connect() {}
    shell(callback) {
      callback(null, { on(name, fn) { if (name === 'close') queueMicrotask(fn); return this; } });
    }
  }
  const client = await connect({ host: 'router', privateKey: 'KEY', ClientClass: ShellClient });
  await expect(client.shell()).resolves.toBeDefined();
  await new Promise(resolve => setImmediate(resolve));
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
  expect(client.state).toBe('open');
});

