import { sshExec } from './index.mjs';
import { jest, test, expect } from '@jest/globals';

test('throws if host is missing', async () => {
  await expect(sshExec({ commands: ['echo hi'] })).rejects.toThrow('host and commands[] are required');
});

test('throws if commands is missing', async () => {
  await expect(sshExec({ host: 'localhost' })).rejects.toThrow('host and commands[] are required');
});

test('throws if no private key is found', async () => {
  // Inject fsLib and homedirFn to simulate missing private key
  const mockFs = { readFile: jest.fn().mockRejectedValue(new Error('not found')) };
  const mockHomedir = () => '/mockhome';
  class DummyClient {
    on() { return this; }
    connect() { return this; }
    end() { return this; }
  }
  await expect(sshExec({
    host: 'localhost',
    commands: ['echo hi'],
    ClientClass: DummyClient,
    fsLib: mockFs,
    homedirFn: mockHomedir,
  })).rejects.toThrow('No private key found in ~/.ssh/');
});

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
        this.handlers['close'] && this.handlers['close'](...args);
      } else if (event === 'data') {
        this.handlers['data'] && this.handlers['data'](...args);
      } else if (event === 'stderr_data') {
        this.handlers['stderr_data'] && this.handlers['stderr_data'](...args);
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
    { result: 'out:fooerr:foo', code: 0 },
    { result: 'out:barerr:bar', code: 0 },
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
