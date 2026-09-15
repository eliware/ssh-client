import { expect, test } from '@jest/globals';
import { readUint64 } from '../../../../src/security/known-hosts/encoding/read-uint64.mjs';

test('reads SSH uint64 values', () => {
  expect(readUint64(Buffer.from([0, 0, 0, 0, 0, 0, 0, 9]), 0)).toEqual({ value: 9n, next: 8 });
  expect(() => readUint64(Buffer.alloc(7), 0)).toThrow('truncated');
});
