import { expect, test } from '@jest/globals';
import { upload } from '../../src/transfer/upload.mjs';

test('exposes upload as a function', () => { expect(upload).toEqual(expect.any(Function)); });
test('starts an upload with a valid options object', async () => { await expect(upload({ sftp: callback => callback(null, { fastPut: (_, __, ___, done) => done(), end() {} }) }, { localPath: 'a', remotePath: 'b', mode: 0o600 })).resolves.toBeUndefined(); });
test('rejects invalid upload options', async () => { await expect(upload({}, null)).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' }); });
