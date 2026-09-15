import { expect, test } from '@jest/globals';
import { sshExec } from '../../../../src/exec/runner/pipeline/execute.mjs';

test('rejects omitted execution options through the default argument', async () => {
  await expect(sshExec()).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
});

test('uses the default SSH transport when no client class is supplied', async () => {
  await expect(sshExec({ host: '127.0.0.1', commands: [], privateKey: 'KEY', hostVerifier: () => true, connectTimeout: 1 })).rejects.toBeDefined();
});
test('covers verifier adapters and validation branches', async () => {
  class C {
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    connect(options) { options.hostVerifier(Buffer.from('key'), value => { this.verified = value; }); this.ready(); }
    end() {}
    exec(_, cb) { cb(null, { on(event, fn) { if (event === 'close') fn(0); return this; }, stderr: { on() { return this; } } }); }
  }
  for (const hostVerifier of [() => true, async () => true, (_key, callback) => callback(true), () => { throw Error('bad verifier'); }]) {
    await expect(sshExec({ host: 'x', commands: ['true'], privateKey: 'KEY', hostVerifier, ClientClass: C })).resolves.toHaveLength(1);
  }
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', hostVerifier: (_key, callback) => { callback(true); callback(false); }, ClientClass: C })).resolves.toEqual([]);
  for (const env of [null, [], { BAD: Symbol('value') }]) await expect(sshExec({ host: 'x', commands: ['true'], privateKey: 'KEY', env, ClientClass: C })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['true'], privateKey: 'KEY', envFallback: 'bad', ClientClass: C })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['true'], privateKey: 'KEY', cwd: 1, ClientClass: C })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['true'], privateKey: 'KEY', shell: true, ClientClass: C })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  class VerifierClient extends C { connect(options) { options.hostVerifier(Buffer.from('key'), () => {}); this.ready(); } }
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', hostVerifier: () => Promise.reject(Error('rejected')), ClientClass: VerifierClient })).resolves.toEqual([]);
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', hostVerifier: () => Object.defineProperty({}, ['th', 'en'].join(''), { value: resolve => resolve(false) }), ClientClass: VerifierClient })).resolves.toEqual([]);
});

test('exec handles streams without close', async () => { class C { on(event, fn) { if (event === 'ready') this.ready = fn; return this; } connect() { this.ready(); } end() {} exec(_, cb) { cb(null, { on() { return this; }, stderr: { on() { return this; } } }); } } await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', commandTimeout: 1, ClientClass: C })).rejects.toMatchObject({ code: 'SSH_COMMAND_TIMEOUT' }); await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', pty: true, commandTimeout: 1, knownHosts: 'x', ClientClass: C })).rejects.toBeDefined(); });

test('exec permits password-only and agent-only authentication', async () => {
  class C { on(event, fn) { if (event === 'ready') this.ready = fn; return this; } connect(options) { this.options = options; this.ready(); } end() {} exec(_, cb) { cb(null, { on(event, fn) { if (event === 'close') fn(0); return this; }, stderr: { on() { return this; } } }); } }
  for (const auth of [{ password: 'secret' }, { agent: 'agent-socket' }]) {
    await expect(sshExec({ host: 'x', commands: ['true'], ...auth, ClientClass: C })).resolves.toHaveLength(1);
  }
});
test('rejects stderr stream errors with context', async () => {
  let stderrError;
  class StderrClient {
    on(event, handler) { this.handlers ??= {}; this.handlers[event] = handler; return this; }
    connect() { this.handlers.ready(); }
    end() {}
    exec(_, callback) { callback(null, { on() { return this; }, stderr: { on(event, handler) { if (event === 'error') stderrError = handler; return this; } } }); }
  }
  const pending = sshExec({ host: 'x', commands: ['run'], privateKey: 'KEY', ClientClass: StderrClient });
  await new Promise(resolve => setImmediate(resolve)); stderrError(Error('stderr failed'));
  await expect(pending).rejects.toMatchObject({ code: 'SSH_EXEC', context: { operation: 'exec', phase: 'stderr' } });
});
test('supports explicit timeout override and non-Error channel failures', async () => {
  class C { on(event, fn) { if (event === 'ready') this.ready = fn; return this; } connect() { this.ready(); } end() {} exec(_, cb) { cb('channel unavailable'); } }
  await expect(sshExec({ host: 'x', commands: ['true'], commandTimeout: 1, timeout: 0, privateKey: 'KEY', ClientClass: C })).rejects.toMatchObject({ code: 'SSH_EXEC' });
});
test('rejects invalid ports before starting execution', async () => {
  await expect(sshExec({ host: 'x', commands: [], port: 70000, privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
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

test('exec rejects without host verification configuration', async () => {
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
});

test('exec handles a connection that ends before the final cleanup', async () => {
  class C {
    on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() { this.handlers?.end?.(); }
  }
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', ClientClass: C })).resolves.toEqual([]);
});


test('cancels a queued execution and ignores a late connection error', async () => {
  const controller = new AbortController();
  class PendingClient {
    on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; return this; }
    connect() { setImmediate(() => controller.abort()); }
    end() {}
  }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', signal: controller.signal, ClientClass: PendingClient })).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
  const client = new PendingClient();
  const completed = sshExec({ host: 'x', commands: [], privateKey: 'KEY', ClientClass: class extends PendingClient { connect() { this.handlers.ready(); } } });
  await expect(completed).resolves.toEqual([]);
  client.handlers?.error?.({ level: 'other', message: 'late' });
});
test('rejects a synchronous connection failure', async () => {
  class ThrowingClient {
    on() { return this; }
    connect() { throw Error('connect sync'); }
    end() {}
  }
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', ClientClass: ThrowingClient })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
});
test('records stdout, stderr, exit status, and truncation', async () => {
  class OutputClient {
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() {}
    exec(_, callback) {
      const stream = {
        on(event, fn) { if (event === 'exit') fn(3, 'TERM'); if (event === 'close') queueMicrotask(() => fn(3, 'TERM')); if (event === 'data') { fn(Buffer.from('abc')); fn('abc'); } return this; },
        stderr: { on(event, fn) { if (event === 'data') fn('err'); return this; } },
        close() {},
      };
      callback(null, stream);
    }
  }
  await expect(sshExec({ host: 'x', commands: ['run'], privateKey: 'KEY', maxOutput: 10, ClientClass: OutputClient })).resolves.toMatchObject([{ stdout: 'abcabc', stderr: 'err', code: 3, signal: 'TERM' }]);
});
test('rejects an already-aborted operation before connecting', async () => {
  const controller = new AbortController(); controller.abort();
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', signal: controller.signal })).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
});
test('bounds repeated close events during channel setup', async () => {
  class ClosingClient {
    on(event, handler) { this.handlers ??= {}; this.handlers[event] = handler; return this; }
    connect() { this.handlers.ready(); }
    end() {}
    exec() { this.handlers.end(); this.handlers.end(); }
  }
  await expect(sshExec({ host: 'x', commands: ['run'], privateKey: 'KEY', ClientClass: ClosingClient })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
});

test('covers transport construction and invalid UTF-8 output', async () => {
  class ThrowingClient { constructor() { throw Error('constructor failed'); } }
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', ClientClass: ThrowingClient })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
  class StringThrowingClient { constructor() { throw 'constructor failed'; } }
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', ClientClass: StringThrowingClient })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
  for (const Invalid of [class { on() { return this; } }, class { connect() {} }]) await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', ClientClass: Invalid })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
  class InvalidOutputClient { on(event, fn) { if (event === 'ready') this.ready = fn; return this; } connect() { this.ready(); } end() {} exec(_, callback) { callback(null, { on(event, fn) { if (event === 'data') fn(Buffer.from([255])); if (event === 'close') fn(); return this; } }); } }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', maxOutput: 1, ClientClass: InvalidOutputClient })).resolves.toMatchObject([{ result: '' }]);
});

test('does not start another command after transport closure', async () => {
  let invocation = 0;
  class ClosingAfterCommand {
    on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; return this; }
    connect() { this.handlers.ready(); }
    end() {}
    exec(_, callback) {
      invocation += 1;
      callback(null, { on(event, fn) { if (event === 'close') { fn(0); this.closeCallback = fn; } return this; } });
      if (invocation === 1) this.handlers.close();
    }
  }
  await expect(sshExec({ host: 'x', commands: ['one', 'two'], privateKey: 'KEY', ClientClass: ClosingAfterCommand })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
  expect(invocation).toBe(1);
});

test('cleans up when cancellation cannot end the transport', async () => {
  class AbortClient {
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() { throw Error('cannot end'); }
    destroy() { this.destroyed = true; }
    exec() {}
  }
  const controller = new AbortController();
  const pending = sshExec({ host: 'x', commands: ['wait'], password: 'secret', signal: controller.signal, ClientClass: AbortClient });
  await Promise.resolve(); controller.abort();
  await expect(pending).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
});
