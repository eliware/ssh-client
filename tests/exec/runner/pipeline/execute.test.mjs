import { expect, jest, test } from '@jest/globals';
import { sshExec } from '../../../../src/exec/runner/pipeline/execute.mjs';
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
    // codescope ignore: the resolved result proves a late timeout cannot reject after completion.
  } finally {
    jest.useRealTimers();
  }
});
test('closes a command channel that opens after timeout', async () => {
  let callback;
  const stream = { close: jest.fn(), on() { return this; } };
  class LateClient {
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() {}
    exec(_, cb) { callback = cb; }
  }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', commandTimeout: 1, ClientClass: LateClient })).rejects.toMatchObject({ code: 'SSH_COMMAND_TIMEOUT' });
  callback(null, stream);
  expect(stream.close).toHaveBeenCalled();
});
test('accepts command streams without stderr', async () => {
  class NoStderrClient {
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() {}
    exec(_, cb) { cb(null, { on(event, fn) { if (event === 'close') fn(0); return this; } }); }
  }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', ClientClass: NoStderrClient })).resolves.toHaveLength(1);
});
test('records a null exit code when the channel closes without status', async () => {
  class NoStatusClient {
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() {}
    exec(_, cb) { cb(null, { on(event, fn) { if (event === 'close') fn(); return this; } }); }
  }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', ClientClass: NoStatusClient })).resolves.toEqual([expect.objectContaining({ code: null })]);
});

test('ignores a stream error after the channel has completed', async () => {
  let error;
  class CompletedClient {
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() {}
    exec(_, callback) { callback(null, { on(event, fn) { if (event === 'close') fn(0); if (event === 'error') error = fn; return this; } }); }
  }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', ClientClass: CompletedClient })).resolves.toHaveLength(1);
  error?.(Error('late stream error'));
});

test('ignores a connection error after execution has settled', async () => {
  let connection;
  class SettledClient {
    constructor() { connection = this; }
    on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; return this; }
    connect() { this.handlers.ready(); }
    end() {}
  }
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', ClientClass: SettledClient })).resolves.toEqual([]);
  connection.handlers.error({ level: 'other', message: 'late' });
});

test('rejects when the connection never becomes ready', async () => {
  class NeverReady { on() { return this; } connect() {} end() {} }
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', connectTimeout: 1, ClientClass: NeverReady })).rejects.toMatchObject({ code: 'SSH_TIMEOUT' });
});

test('handles a stream error and duplicate ready notifications', async () => {
  let streamError;
  class ErrorStreamClient {
    on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; return this; }
    connect() { this.handlers.ready(); this.handlers.ready(); }
    end() {}
    exec(_, callback) { callback(null, { on(event, fn) { if (event === 'error') streamError = fn; return this; }, stderr: { on() { return this; } } }); }
  }
  const failed = sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', ClientClass: ErrorStreamClient });
  await new Promise(resolve => setImmediate(resolve));
  streamError(Error('stream failed'));
  await expect(failed).rejects.toMatchObject({ code: 'SSH_EXEC' });
});

test('ignores a transport close after a reusable execution settles', async () => {
  let client;
  class ReusableClient {
    constructor() { client = this; }
    on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; return this; }
    connect() { this.handlers.ready(); }
    end() {}
    exec(_, callback) { callback(null, { on(event, fn) { if (event === 'close') fn(0); return this; } }); }
  }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', keepAlive: true, ClientClass: ReusableClient })).resolves.toHaveLength(1);
  client.handlers.close();
});
test('keeps reusable transport alive after command timeout', async () => {
  class ReusableTimeoutClient { on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; return this; } connect() { this.handlers.ready(); } end() { this.ended = true; } exec(_, callback) { callback(null, { on() { return this; }, close() {} }); } }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', keepAlive: true, timeout: 1, ClientClass: ReusableTimeoutClient })).rejects.toMatchObject({ code: 'SSH_COMMAND_TIMEOUT' });
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

test('covers deterministic stream output and result mapping', async () => {
  class OutputClient {
    on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; return this; }
    connect() { this.handlers.ready(); }
    end() {}
    exec(_, callback) { callback(null, { on(event, fn) { if (event === 'exit') fn(7, 'TERM'); if (event === 'close') queueMicrotask(() => fn(7, 'TERM')); if (event === 'data') { fn('abcdef'); fn('abcdef'); fn('abcdef'); } return this; }, stderr: { on(event, fn) { if (event === 'data') fn('err'); return this; } }, close() {} }); }
  }
  await expect(sshExec({ host: 'x', commands: ['run'], privateKey: 'KEY', maxOutput: 3, ClientClass: OutputClient })).resolves.toMatchObject([{ stdout: 'abc', truncated: true, code: 7, signal: 'TERM' }]);
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

test('covers channel, stderr, output-limit, and transport fallback paths', async () => {
  let streamHandlers; let stderrHandlers; let callback;
  class BranchClient {
    on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; return this; }
    connect() { this.handlers.ready(); }
    end() {}
    exec(_, cb) {
      callback = cb;
      streamHandlers = {}; stderrHandlers = {};
      cb(null, { on(event, fn) { streamHandlers[event] = fn; return this; }, stderr: { on(event, fn) { stderrHandlers[event] = fn; return this; } }, close: jest.fn() });
    }
  }
  const running = sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', maxOutput: 1, ClientClass: BranchClient });
  await new Promise(resolve => setImmediate(resolve));
  streamHandlers.data(Buffer.from('x')); streamHandlers.data(Buffer.from('late')); streamHandlers.close();
  await expect(running).resolves.toMatchObject([{ truncated: true }]);
  const failed = sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', ClientClass: BranchClient });
  await new Promise(resolve => setImmediate(resolve));
  stderrHandlers.error({});
  await expect(failed).rejects.toMatchObject({ code: 'SSH_EXEC' });
  callback?.(null, { close: jest.fn() });
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

test('handles immediate stderr errors and completed timeout timers', async () => {
  let stderrFailure;
  class ImmediateStderr {
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() {}
    exec(_, callback) { callback(null, { on() { return this; }, stderr: { on(event, fn) { if (event === 'error') stderrFailure = fn; return this; } } }); }
  }
  const stderrRun = sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', ClientClass: ImmediateStderr });
  await new Promise(resolve => setImmediate(resolve)); stderrFailure({});
  await expect(stderrRun).rejects.toMatchObject({ code: 'SSH_EXEC' });
  stderrFailure({});
  const timedStderr = sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', commandTimeout: 1000, ClientClass: ImmediateStderr });
  await new Promise(resolve => setImmediate(resolve)); stderrFailure(Error('timed stderr'));
  await expect(timedStderr).rejects.toMatchObject({ code: 'SSH_EXEC' });
  class ImmediateClose {
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() {}
    exec(_, callback) { callback(null, { on(event, fn) { if (event === 'close') fn(0); return this; } }); }
  }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', commandTimeout: 100, ClientClass: ImmediateClose })).resolves.toHaveLength(1);
  class TimeoutCleanup { on(event, fn) { if (event === 'ready') this.ready = fn; return this; } connect() { this.ready(); } end() { throw Error('end failed'); } destroy() { this.destroyed = true; } exec() {} }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', commandTimeout: 1, keepAlive: true, ClientClass: TimeoutCleanup })).rejects.toMatchObject({ code: 'SSH_COMMAND_TIMEOUT' });
  class ImmediateError { on(event, fn) { if (event === 'ready') this.ready = fn; return this; } connect() { this.ready(); } end() {} exec(_, callback) { callback(null, { on(event, fn) { if (event === 'error') fn(Error('immediate')); return this; } }); } }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', ClientClass: ImmediateError })).rejects.toMatchObject({ code: 'SSH_EXEC' });
});

test('forwards environment requests without shell fallback', async () => {
  let options;
  class EnvironmentClient {
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() {}
    exec(_, args, callback) { options = args; callback(null, { on(event, fn) { if (event === 'close') fn(0); return this; }, stderr: { on() { return this; } } }); }
  }
  await expect(sshExec({ host: 'x', commands: ['env'], env: { TEST_VALUE: 'yes' }, privateKey: 'KEY', ClientClass: EnvironmentClient })).resolves.toHaveLength(1);
  expect(options).toEqual({ env: { TEST_VALUE: 'yes' }, pty: false });
});

test('covers connection errors without messages and command invocation failures', async () => {
  class FailingClient { on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; return this; } connect() { this.handlers.ready(); } end() {} exec() { throw {}; } }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', ClientClass: FailingClient })).rejects.toMatchObject({ code: 'SSH_EXEC' });
  class ErrorClient { on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; return this; } connect() { this.handlers.error({ level: 'other' }); } end() {} }
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', ClientClass: ErrorClient })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
});

test('cancels after the command has started', async () => {
  class PendingClient {
    on(event, fn) { if (event === 'ready') this.ready = fn; return this; }
    connect() { this.ready(); }
    end() {}
    exec() {}
  }
  const controller = new AbortController();
  const pending = sshExec({ host: 'x', commands: ['x'], password: 'secret', signal: controller.signal, ClientClass: PendingClient });
  await Promise.resolve();
  controller.abort();
  await expect(pending).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
});

test('destroys the transport when successful cleanup throws', async () => {
  class CleanupClient {
    constructor() { this.destroy = jest.fn(); }
    on(event, handler) { if (event === 'ready') this.ready = handler; return this; }
    connect() { this.ready(); }
    end() { throw Error('already closed'); }
  }
  const client = new CleanupClient();
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', ClientClass: class extends CleanupClient { constructor() { super(); client.destroy = this.destroy; } } })).resolves.toEqual([]);
  expect(client.destroy).toHaveBeenCalled();
});
