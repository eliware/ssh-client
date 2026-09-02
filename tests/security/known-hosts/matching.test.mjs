import { expect, test } from '@jest/globals';
import { matches, matchesList } from '../../../src/security/known-hosts/matching.mjs';

test('matches positive, wildcard, hashed, and excluded patterns', () => {
  expect(matches('router.example', ['router.example'])).toBe(true);
  expect(matches('*.example', ['router.example'])).toBe(true);
  expect(matches('!router.example', ['router.example'])).toBe(false);
  expect(matches('|1|bad|bad', ['router.example'])).toBe(false);
  expect(matchesList(['*.example'], ['router.example'])).toBe(true);
  expect(matchesList(['!router.example', '*.example'], ['router.example'])).toBe(false);
});
