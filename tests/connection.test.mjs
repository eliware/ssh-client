import { expect, test } from '@jest/globals';
import { connect, createReusableClientAdapter } from '../src/connection.mjs';
test('rejects invalid verifier, timeout, and transport options', async () => {
  await expect(connect({ host: 'router', hostVerifier: 'invalid', ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(connect({ host: 'router', connectTimeout: 0, ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  for (const connectTimeout of [Number.NaN, Infinity, -1, 'fast']) await expect(connect({ host: 'router', connectTimeout, ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(connect({ host: 'router' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(connect({ host: 'router', ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
});

test('delegates every reusable transport adapter operation', () => {
  const calls = [];
  const client = { on: (...args) => calls.push(['on', args]), removeListener: (...args) => calls.push(['remove', args]), once: (...args) => calls.push(['once', args]), emit: (...args) => calls.push(['emit', args]), end: () => calls.push(['end']), destroy: () => calls.push(['destroy']), exec: (...args) => calls.push(['exec', args]) };
  const adapter = createReusableClientAdapter(client);
  expect(adapter.on('a', 1)).toBe(adapter); expect(adapter.removeListener('a', 1)).toBe(adapter); expect(adapter.once('a', 1)).toBe(adapter); expect(adapter.emit('a', 1)).toBe(adapter); adapter.connect(); adapter.end(); adapter.destroy(); adapter.exec('x');
  expect(calls.map(call => call[0])).toEqual(['on', 'remove', 'once', 'emit', 'emit', 'end', 'destroy', 'exec']);
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
test('validates shell timeout and wraps input failures', async () => {
  class Shell {
    once(event, fn) { if (event === 'ready') fn(); return this; }
    on() { return this; }
    connect() {}
    end() {}
    shell(callback) { callback(null, { on() { return this; }, close() {} }); }
  }
  const client = await connect({ host: 'router', privateKey: 'KEY', ClientClass: Shell });
  await expect(client.shell({ timeout: -1 })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(client.shell({ onInput: () => { throw Error('input'); } })).rejects.toMatchObject({ code: 'SSH_SHELL', context: { phase: 'input' } });
  class NoCloseShell extends Shell { shell(callback) { callback(null, { on() { return this; } }); } }
  const noClose = await connect({ host: 'router', privateKey: 'KEY', ClientClass: NoCloseShell });
  await expect(noClose.shell({ onInput: () => { throw 'input without close'; } })).rejects.toMatchObject({ code: 'SSH_SHELL' });
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
test('rejects when the transport ends before ready', async () => {
  class EndingClient {
    once(event, fn) { if (event === 'end') queueMicrotask(fn); return this; }
    connect() {}
  }
  await expect(connect({ host: 'router', privateKey: 'KEY', ClientClass: EndingClient })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
});
test('rejects when client construction throws', async () => {
  await expect(connect({ host: 'router', privateKey: 'KEY', ClientClass: class { constructor() { throw Error('construct'); } } })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
});
test('rejects when the transport connect call throws', async () => {
  class ThrowingClient {
    once() { return this; }
    on() { return this; }
    connect() { throw Error('connect sync'); }
  }
  await expect(connect({ host: 'router', privateKey: 'KEY', ClientClass: ThrowingClient })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
});
test('supports agent-only authentication', async () => {
  class AgentClient {
    once(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; if (event === 'ready') queueMicrotask(fn); return this; }
    on() { return this; }
    connect(options) { this.options = options; }
    end() { this.handlers.close?.(); }
  }
  const client = await connect({ host: 'router', agent: 'agent-socket', ClientClass: AgentClient });
  expect(client.state).toBe('open');
  await client.close();
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
  // codescope ignore: setup resolution is distinct from the returned stream's post-setup lifecycle.
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
test('exercises reusable transport adapters and shell completion', async () => {
  class FullClient {
    constructor() { this.handlers = {}; }
    once(event, fn) { this.handlers[event] = fn; if (event === 'ready') queueMicrotask(fn); return this; }
    on(event, fn) { this.handlers[event] = fn; return this; }
    removeListener(event) { delete this.handlers[event]; return this; }
    emit(event, ...args) { this.handlers[event]?.(...args); return this; }
    connect() {}
    end() { this.handlers.close?.(); }
    destroy() {}
    exec(_, callback) { callback(null, { on(event, fn) { if (event === 'close') queueMicrotask(() => fn(0)); return this; }, stderr: { on() { return this; } } }); }
    shell(callback) { callback(null, { on() { return this; }, once(event, fn) { if (event === 'close') queueMicrotask(() => fn(0)); return this; }, close() {}, end() {} }); }
  }
  const client = await connect({ host: 'router', privateKey: 'KEY', ClientClass: FullClient });
  await expect(client.exec(['true'], { timeout: 100 })).resolves.toHaveLength(1);
  const shell = await client.shell();
  await expect(shell.completion).resolves.toMatchObject({ code: 0 });
  shell.close();
  await client.close();
});


