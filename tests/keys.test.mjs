import { expect, test, jest } from '@jest/globals';
import { loadKey } from '../src/keys.mjs';
test('loads an explicit key before fallback paths', async () => { const fs = { readFile: jest.fn().mockResolvedValue('FILE') }; await expect(loadKey({ privateKey: 'INLINE', privateKeyPath: '/key', fsLib: fs, homedirFn: () => '/home' })).resolves.toBe('INLINE'); expect(fs.readFile).not.toHaveBeenCalled(); });
