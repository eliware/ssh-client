import { expect, jest, test } from '@jest/globals';
import { createOutputCollector } from '../../../../src/exec/commands/output/collector.mjs';

test('collects stdout and stderr up to the byte limit', () => {
  const close = jest.fn();
  const output = createOutputCollector(4, () => ({ close }));
  output.add('stdout', 'ab'); output.add('stderr', 'cd'); output.add('stdout', 'late');
  expect(output.stdout).toBe('ab'); expect(output.stderr).toBe('cd');
  expect(output.merged).toBe('abcd'); expect(output.truncated).toBe(true); expect(close).toHaveBeenCalled();
});

test('closes the active channel when a value exceeds the limit', () => {
  const close = jest.fn();
  const output = createOutputCollector(3, () => ({ close }));
  output.add('stdout', 'abcdef');
  expect(output.stdout).toBe('abc'); expect(output.truncated).toBe(true); expect(close).toHaveBeenCalledTimes(1);
});
