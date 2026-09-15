import { expect, jest, test } from '@jest/globals';
import { adaptHostVerifier } from '../../../src/exec/options/adapt-host-verifier.mjs';

test('adapts synchronous, asynchronous, callback, and failure verifiers', async () => {
  const callback = jest.fn(); adaptHostVerifier(() => true)('key', callback); expect(callback).toHaveBeenCalledWith(true);
  await new Promise(resolve => { adaptHostVerifier(() => Promise.resolve(false))('key', value => { expect(value).toBe(false); resolve(); }); });
  await new Promise(resolve => { adaptHostVerifier((_key, done) => done(true))('key', value => { expect(value).toBe(true); resolve(); }); });
  await new Promise(resolve => { adaptHostVerifier(() => { throw Error('bad'); })('key', value => { expect(value).toBe(false); resolve(); }); });
});

test('ignores duplicate verifier completion', () => { const callback = jest.fn(); adaptHostVerifier((_key, done) => { done(true); done(false); })('key', callback); expect(callback).toHaveBeenCalledTimes(1); });
