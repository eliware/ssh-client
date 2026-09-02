import { expect, test, jest } from '@jest/globals';
import { upload, download } from '../../src/transfer.mjs';
test('accepts option objects for transfers', async () => {
  const sftp = { end() {}, fastPut: (local, remote, options, done) => { expect([local, remote, options.mode]).toEqual(['a', 'b', 0o600]); done(); }, fastGet: (remote, local, done) => { expect([remote, local]).toEqual(['b', 'a']); done(); } };
  const client = { sftp: callback => callback(null, sftp) };
  await upload(client, { localPath: 'a', remotePath: 'b' });
  await download(client, { remotePath: 'b', localPath: 'a' });
});
test('supports transfer timeout and cancellation', async () => {
  const client = { end() {}, sftp: callback => callback(null, { end() {}, fastPut() {}, fastGet() {} }) };
  await expect(upload(client, { localPath: 'a', remotePath: 'b', timeout: 1 })).rejects.toMatchObject({ code: 'SSH_TIMEOUT' });
  const controller = new AbortController(); const pending = upload(client, { localPath: 'a', remotePath: 'b', signal: controller.signal }); controller.abort();
  await expect(pending).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
  await expect(download(client, { remotePath: 'b', localPath: 'a', timeout: 1 })).rejects.toMatchObject({ code: 'SSH_TIMEOUT' });
  const second = new AbortController(); const pendingDownload = download(client, { remotePath: 'b', localPath: 'a', signal: second.signal }); second.abort();
  await expect(pendingDownload).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
});

test('cleans up an SFTP handle supplied after cancellation', async () => {
  let setup;
  const controller = new AbortController();
  const pending = upload({ sftp: callback => { setup = callback; } }, { localPath: 'a', remotePath: 'b', signal: controller.signal });
  controller.abort();
  await expect(pending).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
  const end = jest.fn();
  setup(null, { end });
  expect(end).toHaveBeenCalledTimes(1);
});
// codescope ignore: this matrix covers transfer directions and callback outcomes; live session behavior is integration coverage.
test('handles SFTP success and failure', async () => { const client = { sftp: callback => callback(Error('sftp unavailable')) }; await expect(upload(client, { localPath: 'local', remotePath: 'remote' })).rejects.toThrow('sftp unavailable'); await expect(download(client, { remotePath: 'remote', localPath: 'local' })).rejects.toThrow('sftp unavailable'); const sftp = { end: jest.fn(), fastPut: (_, __, ___, cb) => cb(), fastGet: (_, __, cb) => cb() }; const good = { sftp: cb => cb(null, sftp) }; await expect(upload(good, { localPath: 'local', remotePath: 'remote' })).resolves.toBeUndefined(); await expect(download(good, { remotePath: 'remote', localPath: 'local' })).resolves.toBeUndefined(); const noEnd = { fastPut: (_, __, ___, cb) => cb(), fastGet: (_, __, cb) => cb() }; const noEndClient = { sftp: cb => cb(null, noEnd) }; await upload(noEndClient, { localPath: 'a', remotePath: 'b' }); await download(noEndClient, { remotePath: 'a', localPath: 'b' }); const failure = { end: jest.fn(), fastPut: (_, __, ___, cb) => cb(Error('put')), fastGet: (_, __, cb) => cb(Error('get')) }; const bad = { sftp: cb => cb(null, failure) }; await expect(upload(bad, { localPath: 'a', remotePath: 'b' })).rejects.toThrow('put'); await expect(download(bad, { remotePath: 'a', localPath: 'b' })).rejects.toThrow('get'); expect(sftp.end).toHaveBeenCalledTimes(2); });
test('reports SFTP close failures', async () => {
  const sftp = { end: () => { throw Error('close'); }, fastPut: (_, __, ___, callback) => callback() };
  await expect(upload({ sftp: callback => callback(null, sftp) }, { localPath: 'a', remotePath: 'b' })).rejects.toMatchObject({ code: 'SSH_SFTP' });
});
test('reports synchronous SFTP transfer failures', async () => {
  const sftp = { end: jest.fn(), fastPut: () => { throw Error('put sync'); }, fastGet: () => { throw Error('get sync'); } };
  const client = { sftp: callback => callback(null, sftp) };
  await expect(upload(client, { localPath: 'a', remotePath: 'b' })).rejects.toMatchObject({ code: 'SSH_TRANSFER' });
  await expect(download(client, { remotePath: 'a', localPath: 'b' })).rejects.toMatchObject({ code: 'SSH_TRANSFER' });
});
test('formats non-Error SFTP callback failures', async () => {
  const sftp = { end() {}, fastPut: (_, __, ___, callback) => callback('put failed') };
  await expect(upload({ sftp: callback => callback(null, sftp) }, { localPath: 'a', remotePath: 'b' })).rejects.toThrow('put failed');
});
test('formats callback failures without message fields', async () => {
  const sftp = { end() {}, fastPut: (_, __, ___, callback) => callback({ code: 'EFAIL' }) };
  await expect(upload({ sftp: callback => callback(null, sftp) }, { localPath: 'a', remotePath: 'b' })).rejects.toThrow('[object Object]');
});
test('normalizes synchronous SFTP setup failures', async () => {
  const client = { sftp: () => { throw Error('setup sync'); } };
  await expect(upload(client, { localPath: 'a', remotePath: 'b' })).rejects.toMatchObject({ code: 'SSH_SFTP' });
  await expect(download(client, { remotePath: 'a', localPath: 'b' })).rejects.toMatchObject({ code: 'SSH_SFTP' });
});
test('handles SFTP setup errors without a session object', async () => {
  const client = { sftp: callback => callback(Error('setup'), undefined) };
  await expect(upload(client, { localPath: 'a', remotePath: 'b' })).rejects.toThrow('setup');
  await expect(download(client, { remotePath: 'a', localPath: 'b' })).rejects.toThrow('setup');
});
test('handles already-aborted transfers and cleanup failures', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(upload({ end() {} }, { localPath: 'a', remotePath: 'b', signal: controller.signal })).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
  const closeFailure = { end: () => { throw Error('close'); }, fastPut: (_, __, ___, done) => done() };
  await expect(upload({ sftp: callback => callback(null, closeFailure) }, { localPath: 'a', remotePath: 'b' })).rejects.toMatchObject({ code: 'SSH_SFTP' });
});
test('normalizes non-Error setup failures and ignores duplicate callbacks', async () => {
  const duplicate = { end() {}, fastPut: (_, __, ___, done) => { done(); done(); } };
  await upload({ sftp: callback => callback(null, duplicate) }, { localPath: 'a', remotePath: 'b' });
  await expect(upload({ sftp: callback => callback('setup failed') }, { localPath: 'a', remotePath: 'b' })).rejects.toThrow('setup failed');
  await expect(upload({ sftp: () => { throw 'setup thrown'; } }, { localPath: 'a', remotePath: 'b' })).rejects.toThrow('setup thrown');
  await expect(upload({ sftp: callback => callback(null, undefined) }, { localPath: 'a', remotePath: 'b' })).rejects.toThrow('missing SFTP handle');
});
test('covers optional transfer controls and callback races', async () => {
  const controller = new AbortController();
  const sftp = { fastPut: (_, __, ___, done) => done(), fastGet: (_, __, done) => done() };
  await upload({ sftp: callback => callback(null, sftp) }, { localPath: 'a', remotePath: 'b', timeout: 0, signal: controller.signal });
  await download({ sftp: callback => callback(null, sftp) }, { remotePath: 'a', localPath: 'b', timeout: 0 });
  await expect(upload({ sftp: callback => callback({ code: 'EFAIL' }, {}) }, { localPath: 'a', remotePath: 'b' })).rejects.toMatchObject({ code: 'SSH_SFTP' });
  await expect(upload({ sftp: callback => callback(null, undefined) }, { localPath: 'a', remotePath: 'b' })).rejects.toThrow('missing SFTP handle');
});
test('preserves transfer errors when SFTP cleanup also fails', async () => {
  const sftp = { end: () => { throw Error('close failed'); }, fastPut: (_, __, ___, done) => done(Error('put failed')) };
  await expect(upload({ sftp: callback => callback(null, sftp) }, { localPath: 'a', remotePath: 'b' })).rejects.toMatchObject({ code: 'SSH_TRANSFER' });
});
