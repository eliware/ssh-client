import { expect, test } from '@jest/globals';
import { upload, download } from '../../src/transfer.mjs';
test('rejects invalid transfer timeouts', async () => {
  await expect(upload({}, { localPath: 'a', remotePath: 'b', timeout: -1 })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(download({}, { remotePath: 'a', localPath: 'b', timeout: Infinity })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
});
test('rejects malformed transfer options', async () => {
  await expect(upload({}, null)).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' }); await expect(download({}, { remotePath: '', localPath: 'b' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(upload({}, { localPath: 'a', remotePath: 'b', mode: -1 })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' }); await expect(upload({}, { localPath: 'a', remotePath: 'b', mode: 0o10000 })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
});
