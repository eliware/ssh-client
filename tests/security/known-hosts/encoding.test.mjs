import { expect, test } from '@jest/globals';
import { encodeString, readString, readUint32, readUint64 } from '../../../src/security/known-hosts/encoding.mjs';

test('encodes and reads SSH strings and integers', () => {
  const encoded = encodeString(Buffer.from('host'));
  expect(readString(encoded, 0)).toEqual({ value: Buffer.from('host'), next: 8 });
  const integer = Buffer.alloc(8); integer.writeBigUInt64BE(9n);
  expect(readUint64(integer, 0).value).toBe(9n);
  const word = Buffer.from([0, 0, 0, 7]);
  expect(readUint32(word, 0).value).toBe(7);
});

test('rejects truncated SSH values', () => {
  expect(() => readString(Buffer.alloc(3), 0)).toThrow('truncated');
  expect(() => readString(Buffer.from([0, 0, 0, 4, 1]), 0)).toThrow('truncated');
  expect(() => readUint32(Buffer.alloc(3), 0)).toThrow('truncated');
  expect(() => readUint64(Buffer.alloc(7), 0)).toThrow('truncated');
});
