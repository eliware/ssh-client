import { expect, jest, test } from '@jest/globals';
import { connect } from '../../../../src/connection/lifecycle/client/connect.mjs';
import { prepareConnection } from '../../../../src/connection/lifecycle/client/options.mjs';
import { sshExec } from '../../../../src/exec/runner/pipeline/execute.mjs';

test('rejects missing connection options through the default argument', async () => {
  await expect(prepareConnection()).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
});
test('supports private key paths and rejects invalid ports', async () => {
  const fsLib = { readFile: jest.fn().mockResolvedValue('KEY') };
  await expect(sshExec({ host: 'x', port: 0, commands: [] })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  class ClientMock { on(event, cb) { if (event === 'ready') this.ready = cb; return this; } connect() { this.ready(); return this; } end() {} }
  const promise = sshExec({ host: 'x', commands: [], privateKeyPath: '/key', fsLib, ClientClass: ClientMock });
  expect(fsLib.readFile).toHaveBeenCalledWith('/key', 'utf8');
  await expect(promise).resolves.toEqual([]);
});
test('uses fallback username and default port', async () => {
  const originalUser = process.env.USER; const originalUsername = process.env.USERNAME;
  delete process.env.USER; process.env.USERNAME = 'fallback-user';
  const mockFs = { readFile: jest.fn().mockResolvedValue('PRIVATEKEY') };
  class DummyClient { constructor() { this.ready = null; } on(event, cb) { if (event === 'ready') this.ready = cb; return this; } connect(options) { expect(options.port).toBe(22); expect(options.username).toBe('fallback-user'); this.ready(); return this; } end() {} }
  try { await expect(sshExec({ host: 'localhost', commands: [], ClientClass: DummyClient, fsLib: mockFs, homedirFn: () => '/mockhome' })).resolves.toEqual([]); }
  finally { if (originalUser === undefined) delete process.env.USER; else process.env.USER = originalUser; if (originalUsername === undefined) delete process.env.USERNAME; else process.env.USERNAME = originalUsername; }
});

test('rejects invalid ports and timeout options', async () => {
  await expect(connect({ host: 'router', port: 0 })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(connect({ host: 'router', connectTimeout: 0 })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
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

test('uses an explicit host verifier and skips key loading for password authentication', async () => {
  const hostVerifier = () => true;
  const prepared = await prepareConnection({ host: 'router', password: 'pw', hostVerifier, ClientClass: class {}, fsLib: { readFile: jest.fn() } });
  expect(prepared.clientConfig.privateKey).toBeUndefined();
  expect(prepared.clientConfig.hostVerifier).toBeDefined();
});
