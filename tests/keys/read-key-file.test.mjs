import { expect, test, jest } from '@jest/globals';
import { readKeyFile } from '../../src/keys/read-key-file.mjs';

test('reads the first available key file', async () => {
  const fs = { readFile: jest.fn().mockRejectedValueOnce(Error('missing')).mockResolvedValueOnce('KEY') };
  await expect(readKeyFile(['/one', '/two'], fs)).resolves.toBe('KEY');
  expect(fs.readFile).toHaveBeenNthCalledWith(2, '/two', 'utf8');
});

test('returns no key when all files are unavailable', async () => {
  await expect(readKeyFile(['/one'], { readFile: jest.fn().mockRejectedValue(Error('missing')) })).resolves.toBeUndefined();
});
