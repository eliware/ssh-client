import { expect, test, jest } from '@jest/globals';
import { loadKey } from '../src/keys.mjs';
test('loads an explicit key before fallback paths', async () => { const fs = { readFile: jest.fn().mockResolvedValue('FILE') }; await expect(loadKey({ privateKey: 'INLINE', privateKeyPath: '/key', fsLib: fs, homedirFn: () => '/home' })).resolves.toBe('INLINE'); expect(fs.readFile).not.toHaveBeenCalled(); });
test('loads explicit and fallback key paths and reports missing keys', async () => {
  const explicitFs = { readFile: jest.fn().mockResolvedValue('EXPLICIT') };
  await expect(loadKey({ privateKey: '', privateKeyPath: '/key', fsLib: explicitFs, homedirFn: () => '/home' })).resolves.toBe('EXPLICIT');
  const fallbackFs = { readFile: jest.fn().mockRejectedValueOnce(Error('missing env')).mockRejectedValueOnce(Error('missing ed')).mockResolvedValueOnce('RSA') };
  const previous = process.env.SSH_PRIVATE_KEY_PATH;
  process.env.SSH_PRIVATE_KEY_PATH = '/env-key';
  try { await expect(loadKey({ fsLib: fallbackFs, homedirFn: () => '/home' })).resolves.toBe('RSA'); } finally { if (previous === undefined) delete process.env.SSH_PRIVATE_KEY_PATH; else process.env.SSH_PRIVATE_KEY_PATH = previous; }
  await expect(loadKey({ fsLib: { readFile: jest.fn().mockRejectedValue(Error('missing')) }, homedirFn: () => '/home' })).rejects.toMatchObject({ code: 'SSH_KEY_NOT_FOUND' });
});
