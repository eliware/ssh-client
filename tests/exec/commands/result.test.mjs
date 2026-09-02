import { expect, test } from '@jest/globals';
import { createCommandResult } from '../../../src/exec/commands/result.mjs';

test('creates a normalized command result from exit and close state', () => {
  const result = createCommandResult({ command: 'run', stdout: 'out', stderr: 'err', merged: 'out\nerr', maxOutput: 100, truncated: false, exitCode: undefined, closeCode: 0, exitSignal: undefined, closeSignal: 'TERM', started: Date.now() - 5 });
  expect(result).toMatchObject({ command: 'run', stdout: 'out', stderr: 'err', code: 0, signal: 'TERM', truncated: false });
  expect(result.duration).toBeGreaterThanOrEqual(0);
});
