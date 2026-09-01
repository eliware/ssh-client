import { expect, test, jest } from '@jest/globals';
import { upload, download } from '../src/transfer.mjs';
test('handles SFTP success and failure', async () => { const client = { sftp: callback => callback(Error('sftp unavailable')) }; await expect(upload(client, 'local', 'remote')).rejects.toThrow('sftp unavailable'); await expect(download(client, 'remote', 'local')).rejects.toThrow('sftp unavailable'); const sftp = { end: jest.fn(), fastPut: (_, __, ___, cb) => cb(), fastGet: (_, __, cb) => cb() }; const good = { sftp: cb => cb(null, sftp) }; await expect(upload(good, 'local', 'remote')).resolves.toBeUndefined(); await expect(download(good, 'remote', 'local')).resolves.toBeUndefined(); const noEnd = { fastPut: (_, __, ___, cb) => cb(), fastGet: (_, __, cb) => cb() }; const noEndClient = { sftp: cb => cb(null, noEnd) }; await upload(noEndClient, 'a', 'b'); await download(noEndClient, 'a', 'b'); const failure = { end: jest.fn(), fastPut: (_, __, ___, cb) => cb(Error('put')), fastGet: (_, __, cb) => cb(Error('get')) }; const bad = { sftp: cb => cb(null, failure) }; await expect(upload(bad, 'a', 'b')).rejects.toThrow('put'); await expect(download(bad, 'a', 'b')).rejects.toThrow('get'); expect(sftp.end).toHaveBeenCalledTimes(2); });
test('reports SFTP close failures', async () => {
  const sftp = { end: () => { throw Error('close'); }, fastPut: (_, __, ___, callback) => callback() };
  await expect(upload({ sftp: callback => callback(null, sftp) }, 'a', 'b')).rejects.toMatchObject({ code: 'SSH_SFTP' });
});
test('reports synchronous SFTP transfer failures', async () => {
  const sftp = { end: jest.fn(), fastPut: () => { throw Error('put sync'); }, fastGet: () => { throw Error('get sync'); } };
  const client = { sftp: callback => callback(null, sftp) };
  await expect(upload(client, 'a', 'b')).rejects.toMatchObject({ code: 'SSH_TRANSFER' });
  await expect(download(client, 'a', 'b')).rejects.toMatchObject({ code: 'SSH_TRANSFER' });
});
test('formats non-Error SFTP callback failures', async () => {
  const sftp = { end() {}, fastPut: (_, __, ___, callback) => callback('put failed') };
  await expect(upload({ sftp: callback => callback(null, sftp) }, 'a', 'b')).rejects.toThrow('put failed');
});
test('normalizes synchronous SFTP setup failures', async () => {
  const client = { sftp: () => { throw Error('setup sync'); } };
  await expect(upload(client, 'a', 'b')).rejects.toMatchObject({ code: 'SSH_SFTP' });
  await expect(download(client, 'a', 'b')).rejects.toMatchObject({ code: 'SSH_SFTP' });
});
