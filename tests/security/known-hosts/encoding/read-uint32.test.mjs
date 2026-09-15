import { expect, test } from '@jest/globals';
import { readUint32 } from '../../../../src/security/known-hosts/encoding/read-uint32.mjs';

test('reads SSH uint32 values', () => {
  expect(readUint32(Buffer.from([0, 0, 0, 7]), 0)).toEqual({ value: 7, next: 4 });
  expect(() => readUint32(Buffer.alloc(3), 0)).toThrow('truncated');
});
