import { expect, test } from '@jest/globals';
import { connect } from '../../src/connection/lifecycle/client/connect.mjs';
import { validateConnectionOptions } from '../../src/connection/validation.mjs';
test('rejects invalid verifier, timeout, and transport options', async () => {
  await expect(connect({ host: 'router', hostVerifier: 'invalid', ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' }); await expect(connect({ host: 'router', connectTimeout: 0, ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  for (const connectTimeout of [Number.NaN, Infinity, -1, 'fast']) await expect(connect({ host: 'router', connectTimeout, ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' }); await expect(connect({ host: 'router' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' }); await expect(connect({ host: 'router', privateKey: 'KEY', ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
});

test('applies the default connection port during validation', () => {
  expect(() => validateConnectionOptions({ host: 'router', ClientClass: class {}, hostVerifier: () => true }, class {}, 100)).not.toThrow();
});

test('adapts reusable connection host verifiers', async () => {
  for (const hostVerifier of [() => true, async () => true, (_key, callback) => callback(true)]) {
    let instance;
    class Client {
      constructor() { instance = this; }
      once(event, handler) { this[event] = handler; return this; }
      on() { return this; }
      connect(config) { config.hostVerifier(Buffer.from('key'), value => { this.verified = value; }); this.ready(); }
      end() { this.close?.(); }
    }
    const client = await connect({ host: 'router', privateKey: 'KEY', hostVerifier, ClientClass: Client });
    await Promise.resolve();
    expect(instance.verified).toBe(true);
    await client.close();
  }
});
