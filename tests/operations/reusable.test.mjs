import { expect, test } from '@jest/globals';
import { reusableExec, reusableUpload, reusableDownload } from '../../src/operations/reusable.mjs';
import { sshExec } from '../../src/exec/runner/pipeline/execute.mjs';
import { createReusableClientAdapter } from '../../src/connection/adapter/reusable.mjs';

test('handles optional transport methods and synchronous shutdown failures', () => {
  const calls = [];
  const client = {
    on: () => {},
    once: () => {},
    end: () => { throw Error('closed'); },
  };
  const adapter = createReusableClientAdapter(client);
  expect(adapter.removeListener('event', 1)).toBe(adapter);
  expect(adapter.emit('event')).toBe(adapter);
  adapter.connect();
  adapter.end();
  adapter.destroy();
  expect(calls).toEqual([]);
});

test('delegates reusable command and transfer operations', async () => {
  const client = {
    on: () => client,
    once: (event, callback) => { if (event === 'ready') queueMicrotask(callback); return client; },
    emit: () => client,
    end: () => client,
    connect: () => client,
    exec: (_command, callback) => callback(null, { on: (event, fn) => { if (event === 'close') queueMicrotask(() => fn(0)); return this; }, stderr: { on: () => client } }),
    sftp: callback => callback(null, { fastPut: (_local, _remote, _options, done) => done(), fastGet: (_remote, _local, done) => done(), end: () => {} }),
  };
  await expect(reusableExec(client, {}, [])).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  const stalled = { on: () => stalled, once: () => stalled, end: () => {} };
  await expect(reusableExec(stalled, { host: 'router', privateKey: 'KEY', connectTimeout: 1 }, ['true'])).rejects.toMatchObject({ code: 'SSH_TIMEOUT' });
  await expect(reusableUpload(client, { localPath: 'local', remotePath: 'remote' })).resolves.toBeUndefined();
  await expect(reusableDownload(client, { remotePath: 'remote', localPath: 'local' })).resolves.toBeUndefined();
});
test('keeps reusable transport alive after command timeout', async () => {
  class ReusableTimeoutClient { on(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; return this; } connect() { this.handlers.ready(); } end() { this.ended = true; } exec(_, callback) { callback(null, { on() { return this; }, close() {} }); } }
  await expect(sshExec({ host: 'x', commands: ['x'], privateKey: 'KEY', keepAlive: true, timeout: 1, ClientClass: ReusableTimeoutClient })).rejects.toMatchObject({ code: 'SSH_COMMAND_TIMEOUT' });
});
