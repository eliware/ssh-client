import { expect, test } from '@jest/globals';
import { sameKey } from '../../../../src/security/known-hosts/verification/keys.mjs';

test('compares parsed public keys and fails closed on invalid records', () => {
  const publicKey = {};
  const actual = { getPublicSSH: () => publicKey };
  const utils = { parseKey: value => ({ getPublicSSH: () => ({ equals: key => value === 'public' && key === publicKey }) }) };
  expect(sameKey('record', actual, utils)).toBe(false);
  expect(sameKey('public', actual, utils)).toBe(true);
  expect(sameKey('bad', actual, { parseKey: () => { throw Error('bad'); } })).toBe(false);
});
