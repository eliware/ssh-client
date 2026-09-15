import { expect, test } from '@jest/globals';
import { matchesList } from '../../../../src/security/known-hosts/matching/list.mjs';

test('matches positive and negative host pattern lists', () => {
  expect(matchesList(['*.example.com'], ['db.example.com'])).toBe(true);
  expect(matchesList(['*.example.com', '!db.example.com'], ['db.example.com'])).toBe(false);
  expect(matchesList(['!db.example.com'], ['db.example.com'])).toBe(false);
});
