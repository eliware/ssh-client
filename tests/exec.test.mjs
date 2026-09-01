import { expect, jest, test } from '@jest/globals';
import { sshExec } from '../src/exec.mjs';
test('exec module validates options and handles streams without close', async () => { await expect(sshExec({ commands: [] })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' }); class C { on(event, fn) { if (event === 'ready') this.ready = fn; return this; } connect() { this.ready(); } end() {} exec(_, cb) { cb(null, { on() { return this; }, stderr: { on() { return this; } } }); } } await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', commandTimeout: 1, ClientClass: C })).rejects.toMatchObject({ code: 'SSH_COMMAND_TIMEOUT' }); await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', pty: true, knownHosts: 'x', ClientClass: C })).rejects.toBeDefined(); });

test('exec rejects invalid command values and output limits', async () => {
  await expect(sshExec({ host: 'x', commands: ['ok', 1], privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['ok'], maxOutput: 0, privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['ok'], maxOutput: Infinity, privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['ok'], connectTimeout: 0, privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['ok'], commandTimeout: -1, privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['ok'], cwd: 'safe; whoami', privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['ok'], hostCaPath: '/ca', privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_CERT_UNSUPPORTED' });
});

test('rejects a premature connection close while executing', async () => {
  class C {
    on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() {}
    exec() { this.handlers.close?.(); }
  }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', ClientClass: C })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
});
test('times out when a command channel never opens', async () => {
  class C {
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() {}
    exec() {}
  }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', commandTimeout: 1, ClientClass: C })).rejects.toMatchObject({ code: 'SSH_COMMAND_TIMEOUT' });
});

test('exec connects without host verification configuration', async () => {
  class C { on(event, fn) { if (event === 'ready') this.ready = fn; return this; } connect() { this.ready(); } end() {} }
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', ClientClass: C })).resolves.toEqual([]);
});

test('exec handles a connection that ends before the final cleanup', async () => {
  class C {
    on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() { this.handlers?.end?.(); }
  }
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', ClientClass: C })).resolves.toEqual([]);
});

test('exec ignores a late stream close after command timeout', async () => {
  let close;
  class C {
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() {}
    exec(_, cb) { const stream = { on(event, fn) { if (event === 'close') close = fn; return this; }, stderr: { on() { return this; } }, close() {} }; cb(null, stream); }
  }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', commandTimeout: 1, ClientClass: C })).rejects.toMatchObject({ code: 'SSH_COMMAND_TIMEOUT' });
  close?.(0);
});

test('exec ignores a timeout callback after the stream already closed', async () => {
  jest.useFakeTimers();
  try {
    class C {
      on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
      connect() { this.ready(); }
      end() {}
      exec(_, cb) { cb(null, { on(event, fn) { if (event === 'close') fn(0); return this; }, stderr: { on() { return this; } }, close() {} }); }
    }
    await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', commandTimeout: 1, ClientClass: C })).resolves.toEqual([expect.objectContaining({ code: 0 })]);
    jest.advanceTimersByTime(1);
  } finally {
    jest.useRealTimers();
  }
});
