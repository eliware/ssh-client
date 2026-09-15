import { expect, test } from '@jest/globals';
import { expandHomePath } from '../../src/paths/expand-home-path.mjs';

test('expands home-relative paths', () => {
  expect(expandHomePath('~/.ssh/known_hosts', () => '/home/test')).toBe('/home/test/.ssh/known_hosts');
  expect(expandHomePath('/tmp/key', () => '/home/test')).toBe('/tmp/key');
});
