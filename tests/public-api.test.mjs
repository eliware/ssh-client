import { jest, test, expect } from '@jest/globals';
import '../index.mjs';

import { sshExec } from '../index.mjs';

test('successful command execution (mocked)', async () => {
  const mockFs = { readFile: jest.fn().mockResolvedValue('PRIVATEKEY') };
  const mockHomedir = () => '/mockhome';
  const events = {};
  class DummyStream {
    constructor() { this.handlers = {}; }
    on(event, cb) { this.handlers[event] = cb; return this; }
    stderr = { on: (event, cb) => { this.handlers['stderr_' + event] = cb; return this; } };
    trigger(event, ...args) {
      if (event === 'close') {
        if (this.handlers.close) this.handlers.close(...args);
      } else if (event === 'data') {
        if (this.handlers.data) this.handlers.data(...args);
      } else if (event === 'stderr_data') {
        if (this.handlers.stderr_data) this.handlers.stderr_data(...args);
      }
    }
  }
  class DummyClient {
    on(event, cb) { events[event] = cb; return this; }
    connect() { setTimeout(() => events['ready'](), 0); return this; }
    end() { return this; }
    exec(cmd, cb) {
      const stream = new DummyStream();
      setTimeout(() => {
        stream.trigger('data', `out:${cmd}`);
        stream.trigger('stderr_data', `err:${cmd}`);
        stream.trigger('close', 0);
      }, 0);
      cb(null, stream);
      return this;
    }
  }
  const result = await sshExec({
    host: 'localhost',
    commands: ['foo', 'bar'],
    ClientClass: DummyClient,
    fsLib: mockFs,
    homedirFn: mockHomedir,
  });
  expect(result).toEqual([
    expect.objectContaining({ command: 'foo', stdout: 'out:foo', stderr: 'err:foo', result: 'out:fooerr:foo', code: 0 }),
    expect.objectContaining({ command: 'bar', stdout: 'out:bar', stderr: 'err:bar', result: 'out:barerr:bar', code: 0 }),
  ]);
});


test('ssh exec error', async () => {
  const mockFs = { readFile: jest.fn().mockResolvedValue('PRIVATEKEY') };
  const mockHomedir = () => '/mockhome';
  class DummyClient {
    on(event, cb) { if (event === 'ready') this._ready = cb; return this; }
    connect() { setTimeout(() => this._ready(), 0); return this; }
    end() { return this; }
    exec(cmd, cb) { cb(new Error('execfail')); }
  }
  await expect(sshExec({
    host: 'localhost',
    commands: ['fail'],
    ClientClass: DummyClient,
    fsLib: mockFs,
    homedirFn: mockHomedir,
  })).rejects.toThrow('SSH exec error: execfail');
});


test('ssh connection error', async () => {
  const mockFs = { readFile: jest.fn().mockResolvedValue('PRIVATEKEY') };
  const mockHomedir = () => '/mockhome';
  class DummyClient {
    on(event, cb) { if (event === 'error') this._error = cb; if (event === 'ready') this._ready = cb; return this; }
    connect() { setTimeout(() => this._error(new Error('netfail')), 0); return this; }
    end() { return this; }
  }
  await expect(sshExec({
    host: 'localhost',
    commands: ['foo'],
    ClientClass: DummyClient,
    fsLib: mockFs,
    homedirFn: mockHomedir,
  })).rejects.toThrow('SSH connection error: netfail');
});


test('ssh authentication error', async () => {
  const mockFs = { readFile: jest.fn().mockResolvedValue('PRIVATEKEY') };
  const mockHomedir = () => '/mockhome';
  class DummyClient {
    on(event, cb) { if (event === 'error') this._error = cb; if (event === 'ready') this._ready = cb; return this; }
    connect() { setTimeout(() => this._error({ message: 'bad auth', level: 'client-authentication' }), 0); return this; }
    end() { return this; }
  }
  await expect(sshExec({
    host: 'localhost',
    commands: ['foo'],
    ClientClass: DummyClient,
    fsLib: mockFs,
    homedirFn: mockHomedir,
  })).rejects.toThrow('SSH authentication failed: bad auth');
});


test('ssh timeout error', async () => {
  const mockFs = { readFile: jest.fn().mockResolvedValue('PRIVATEKEY') };
  const mockHomedir = () => '/mockhome';
  class DummyClient {
    on(event, cb) { if (event === 'error') this._error = cb; if (event === 'ready') this._ready = cb; return this; }
    connect() { setTimeout(() => this._error({ message: 'timeout', level: 'client-timeout' }), 0); return this; }
    end() { return this; }
  }
  await expect(sshExec({
    host: 'localhost',
    commands: ['foo'],
    ClientClass: DummyClient,
    fsLib: mockFs,
    homedirFn: mockHomedir,
  })).rejects.toThrow('SSH connection timed out: timeout');
});


test('handles connection end and close events', async () => {
  const mockFs = { readFile: jest.fn().mockResolvedValue('PRIVATEKEY') };
  class DummyClient {
    constructor() { this.handlers = {}; }
    on(event, cb) { this.handlers[event] = cb; return this; }
    connect() { setTimeout(() => this.handlers.ready(), 0); return this; }
    end() { this.handlers.end?.(); this.handlers.close?.(); return this; }
    exec(_cmd, cb) {
      const stream = { on(event, handler) { if (event === 'close') setTimeout(() => handler(0), 0); return this; }, stderr: { on() { return this; } } };
      cb(null, stream);
    }
  }
  await expect(sshExec({ host: 'localhost', commands: ['echo'], ClientClass: DummyClient, fsLib: mockFs, homedirFn: () => '/mockhome' }))
    .resolves.toEqual([expect.objectContaining({ command: 'echo', stdout: '', stderr: '', result: '', code: 0 })]);
});


test('ignores connection close after completion', async () => {
  const mockFs = { readFile: jest.fn().mockResolvedValue('PRIVATEKEY') };
  class DummyClient {
    constructor() { this.handlers = {}; }
    on(event, cb) { this.handlers[event] = cb; return this; }
    connect() { setTimeout(() => this.handlers.ready(), 0); return this; }
    end() { this.handlers.end?.(); this.handlers.close?.(); this.handlers.error?.(new Error('late')); return this; }
    exec(_cmd, cb) { cb(null, { on(event, handler) { if (event === 'close') handler(0); return this; }, stderr: { on() { return this; } } }); }
  }
  await expect(sshExec({ host: 'localhost', commands: ['echo'], ClientClass: DummyClient, fsLib: mockFs, homedirFn: () => '/mockhome' })).resolves.toEqual([expect.objectContaining({ command: 'echo', code: 0 })]);
});


test('supports explicit keys, cwd, env, pty, and connection options', async () => {
  const calls = [];
  class ClientMock {
    constructor() { this.handlers = {}; }
    on(event, cb) { this.handlers[event] = cb; return this; }
    connect(options) { calls.push(['connect', options]); this.handlers.ready(); return this; }
    exec(...args) { calls.push(['exec', ...args]); const cb = args.at(-1); const stream = { on(event, handler) { if (event === 'close') handler(0); return this; }, stderr: { on() { return this; } } }; cb(null, stream); }
    end() {}
  }
  const result = await sshExec({ host: 'x', commands: ['echo hi'], privateKey: 'KEY', cwd: '/tmp', env: { A: 'b' }, pty: true, passphrase: 'p', agent: 'a', hostVerifier: () => true, knownHosts: 'hosts', ClientClass: ClientMock });
  expect(result[0].command).toBe('echo hi');
  expect(calls[0][1]).toMatchObject({ privateKey: 'KEY', passphrase: 'p', agent: 'a', knownHosts: 'hosts' });
  expect(calls[1][0]).toBe('exec');
  expect(calls[1][1]).toContain("cd '/tmp'");
});


test('does not apply connection timeout after connection is ready', async () => {
  class ClientMock {
    on(event, cb) { if (event === 'ready') this.ready = cb; return this; }
    connect() { this.ready(); return this; }
    exec(_command, cb) {
      const stream = { on(event, handler) { if (event === 'close') setTimeout(() => handler(0), 10); return this; }, stderr: { on() { return this; } } };
      cb(null, stream);
    }
    end() {}
  }
  await expect(sshExec({ host: 'x', commands: ['slow'], privateKey: 'KEY', connectTimeout: 1, ClientClass: ClientMock }))
    .resolves.toEqual([expect.objectContaining({ code: 0 })]);
});


test('does not end an already-ended connection on exec error', async () => {
  const client = { ended: false };
  class ClientMock {
    on(event, cb) { this.handlers ??= {}; this.handlers[event] = cb; return this; }
    connect() { this.handlers.ready(); return this; }
    exec(_command, cb) { this.handlers.end(); cb(new Error('late exec')); }
    end() { client.ended = true; }
  }
  await expect(sshExec({ host: 'x', commands: ['fail'], privateKey: 'KEY', ClientClass: ClientMock }))
    .rejects.toMatchObject({ code: 'SSH_EXEC' });
  expect(client.ended).toBe(false);
});
