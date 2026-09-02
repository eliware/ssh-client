import { expect, test } from '@jest/globals';
import { upload, download } from '../src/transfer.mjs';

test('exposes upload and download operations', () => {
  expect(upload).toEqual(expect.any(Function));
  expect(download).toEqual(expect.any(Function));
});
