import { expect, test } from '@jest/globals';
import { fitBytes } from '../../../../src/exec/commands/output/decode.mjs';

test('fits UTF-8 output without returning partial characters', () => {
  expect(fitBytes(Buffer.from('hello'), 3)).toBe('hel');
  expect(fitBytes(Buffer.from('€x'), 2)).toBe('');
  expect(fitBytes(Buffer.from('€x'), 3)).toBe('€');
});

test('returns an empty string when no valid prefix fits', () => {
  expect(fitBytes(Buffer.from([0xff]), 0)).toBe('');
  expect(fitBytes(Buffer.from('value'), -1)).toBe('');
});
