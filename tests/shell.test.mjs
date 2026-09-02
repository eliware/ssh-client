import { expect, test } from '@jest/globals';
import { openShell } from '../src/shell.mjs';

test('exports the shell operation', () => {
  expect(openShell).toEqual(expect.any(Function));
});
