import { expect, test } from '@jest/globals';
import { connect } from '../../src/connection/lifecycle/client/connect.mjs';
import { validateConnectionOptions } from '../../src/connection/validation.mjs';
test('rejects invalid verifier, timeout, and transport options', async () => {
  await expect(connect({ host: 'router', hostVerifier: 'invalid', ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' }); await expect(connect({ host: 'router', connectTimeout: 0, ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  for (const connectTimeout of [Number.NaN, Infinity, -1, 'fast']) await expect(connect({ host: 'router', connectTimeout, ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' }); await expect(connect({ host: 'router' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' }); await expect(connect({ host: 'router', ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
});

test('applies the default connection port during validation', () => {
  expect(() => validateConnectionOptions({ host: 'router', ClientClass: class {}, hostVerifier: () => true }, class {}, 100)).not.toThrow();
});
