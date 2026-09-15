import { expect, test } from '@jest/globals';
import { normalizePresentedKey } from '../../../../src/security/known-hosts/verification/normalize-presented-key.mjs';

test('normalizes ordinary presented keys', () => {
  const parsed = { getPublicSSH: () => Buffer.from('public') };
  expect(normalizePresentedKey(Buffer.from('key'), { parseKey: () => parsed })).toEqual({ actual: parsed, certificate: null });
});

test('fails safely for malformed presented keys', () => {
  expect(() => normalizePresentedKey(Buffer.from('bad'), { parseKey: () => { throw Error('bad'); } })).toThrow('bad');
});
