import { expect, test } from '@jest/globals';
import { defaultConnectionPort, defaultConnectionTimeout } from '../../../src/connection/options/defaults.mjs';

test('provides connection defaults', () => {
  expect(defaultConnectionPort()).toBe(22);
  expect(defaultConnectionPort(2222)).toBe(2222);
  expect(defaultConnectionTimeout()).toBe(10000);
  expect(defaultConnectionTimeout(50)).toBe(50);
});
