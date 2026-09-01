import { jest, test, expect } from '@jest/globals';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import ssh2 from '@eliware/ssh2';
import '../index.mjs';

import { connect, createHostVerifier, sshExec } from '../index.mjs';

test('connect validates missing host through the public entry point', async () => {
  await expect(connect()).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
});

test('connect falls back to USERNAME when USER is unavailable', async () => {
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

test('throws if options are omitted', async () => {
  await expect(sshExec()).rejects.toThrow('host and commands[] are required');
});


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


test('uses fallback username and default port', async () => {
  const originalUser = process.env.USER; const originalUsername = process.env.USERNAME;
  delete process.env.USER; process.env.USERNAME = 'fallback-user';
  const mockFs = { readFile: jest.fn().mockResolvedValue('PRIVATEKEY') };
  class DummyClient { constructor() { this.ready = null; } on(event, cb) { if (event === 'ready') this.ready = cb; return this; } connect(options) { expect(options.port).toBe(22); expect(options.username).toBe('fallback-user'); this.ready(); return this; } end() {} }
  await expect(sshExec({ host: 'localhost', commands: [], ClientClass: DummyClient, fsLib: mockFs, homedirFn: () => '/mockhome' })).resolves.toEqual([]);
  if (originalUser === undefined) delete process.env.USER; else process.env.USER = originalUser;
  if (originalUsername === undefined) delete process.env.USERNAME; else process.env.USERNAME = originalUsername;
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
  expect(calls[0][1]).toMatchObject({ privateKey: 'KEY', passphrase: 'p', agent: 'a', knownHosts: 'hosts', shell: false });
  expect(calls[1][0]).toBe('exec');
  expect(calls[1][1]).toContain("cd \"/tmp\"");
});


test('supports private key path and rejects invalid ports', async () => {
  const fsLib = { readFile: jest.fn().mockResolvedValue('KEY') };
  await expect(sshExec({ host: 'x', port: 0, commands: [] })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  class ClientMock { on(event, cb) { if (event === 'ready') this.ready = cb; return this; } connect() { this.ready(); return this; } end() {} }
  const promise = sshExec({ host: 'x', commands: [], privateKeyPath: '/key', fsLib, ClientClass: ClientMock });
  expect(fsLib.readFile).toHaveBeenCalledWith('/key', 'utf8');
  await expect(promise).resolves.toEqual([]);
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


test('times out a remote command', async () => {
  class ClientMock {
    on(event, cb) { if (event === 'ready') this.ready = cb; return this; }
    connect() { this.ready(); return this; }
    exec(_command, cb) { cb(null, { close() {}, on() { return this; }, stderr: { on() { return this; } } }); }
    end() {}
  }
  await expect(sshExec({ host: 'x', commands: ['hang'], privateKey: 'KEY', commandTimeout: 1, ClientClass: ClientMock }))
    .rejects.toMatchObject({ code: 'SSH_COMMAND_TIMEOUT' });
});


test('caps output at maxOutput', async () => {
  class ClientMock {
    on(event, cb) { if (event === 'ready') this.ready = cb; return this; }
    connect() { this.ready(); return this; }
    exec(_command, cb) { const stream = { on(event, handler) { if (event === 'data') handler('123456'); if (event === 'close') handler(0); return this; }, stderr: { on(event, handler) { if (event === 'data') handler('abcdef'); return this; } } }; cb(null, stream); }
    end() {}
  }
  const [result] = await sshExec({ host: 'x', commands: ['out'], privateKey: 'KEY', maxOutput: 4, ClientClass: ClientMock });
  expect(result.result.length).toBeLessThanOrEqual(4);
});


test('times out an SSH connection', async () => {
  class ClientMock { on() { return this; } connect() { return this; } end() {} }
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', connectTimeout: 1, ClientClass: ClientMock }))
    .rejects.toMatchObject({ code: 'SSH_TIMEOUT' });
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

const integrationReady = process.env.SSH_CLIENT_INTEGRATION === '1'
  && process.env.SSH_CLIENT_INTEGRATION_HOST
  && process.env.SSH_CLIENT_INTEGRATION_USER
  && (process.env.SSH_CLIENT_INTEGRATION_PRIVATE_KEY || process.env.SSH_CLIENT_INTEGRATION_PASSWORD)
  && (process.env.SSH_CLIENT_INTEGRATION_KNOWN_HOSTS || process.env.SSH_CLIENT_INTEGRATION_CA);

const integrationTest = integrationReady ? test : test.skip;
integrationTest('real SSH integration: verifies, executes, transfers, and closes', async () => {
  const transport = process.env.SSH_CLIENT_INTEGRATION_TRANSPORT
    ? (await import(pathToFileURL(process.env.SSH_CLIENT_INTEGRATION_TRANSPORT))).default
    : undefined;
  const options = {
    host: process.env.SSH_CLIENT_INTEGRATION_HOST,
    port: Number(process.env.SSH_CLIENT_INTEGRATION_PORT || 22),
    username: process.env.SSH_CLIENT_INTEGRATION_USER,
    privateKeyPath: process.env.SSH_CLIENT_INTEGRATION_PRIVATE_KEY,
    password: process.env.SSH_CLIENT_INTEGRATION_PASSWORD,
    knownHostsPath: process.env.SSH_CLIENT_INTEGRATION_KNOWN_HOSTS,
    hostCaPath: process.env.SSH_CLIENT_INTEGRATION_CA,
    ClientClass: transport,
  };
  const client = await connect(options);
  const source = join(await fs.mkdtemp(join(tmpdir(), 'ssh-client-integration-')), 'source.txt');
  const copy = `${source}.copy`;
  const remote = process.env.SSH_CLIENT_INTEGRATION_REMOTE_PATH || `/tmp/ssh-client-${Date.now()}.txt`;
  await fs.writeFile(source, 'ssh-client integration\n');
  try {
    const [result] = await client.exec(['echo integration']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('integration');
    await client.upload(source, remote);
    await client.download(remote, copy);
    expect(await fs.readFile(copy, 'utf8')).toBe('ssh-client integration\n');
  } finally {
    await client.close();
    await fs.rm(source, { force: true });
    await fs.rm(copy, { force: true });
  }
});

integrationTest('real SSH certificate policy rejects tampering and revocation', async () => {
  const certPath = process.env.SSH_CLIENT_INTEGRATION_CERT;
  if (!certPath || !process.env.SSH_CLIENT_INTEGRATION_CA) return;
  const encoded = (await fs.readFile(certPath, 'utf8')).trim().split(/\s+/)[1];
  const valid = Buffer.from(encoded, 'base64');
  const invalid = Buffer.from(valid);
  invalid[invalid.length - 1] ^= 1;
  const verifier = createHostVerifier({
    host: process.env.SSH_CLIENT_INTEGRATION_HOST,
    port: Number(process.env.SSH_CLIENT_INTEGRATION_PORT || 22),
    hostCaPath: process.env.SSH_CLIENT_INTEGRATION_CA,
    fsLib: fs,
    homedirFn: homedir,
    utils: ssh2.utils,
  });
  expect(await verifier(valid)).toBe(true);
  expect(await verifier(invalid)).toBe(false);
  const revoked = createHostVerifier({
    host: process.env.SSH_CLIENT_INTEGRATION_HOST,
    port: Number(process.env.SSH_CLIENT_INTEGRATION_PORT || 22),
    knownHosts: `@revoked ${process.env.SSH_CLIENT_INTEGRATION_HOST} ssh-ed25519 key`,
    hostCaPath: process.env.SSH_CLIENT_INTEGRATION_CA,
    fsLib: fs,
    homedirFn: homedir,
    utils: ssh2.utils,
  });
  expect(await revoked(valid)).toBe(false);
});
