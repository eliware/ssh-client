import { expect, test } from '@jest/globals';
import { quoteShell, withEnvironment } from '../src/environment.mjs';

test('formats supported remote shell environments and validates input', () => {
  expect(withEnvironment('run', { A: "x'y" }, 'posix')).toContain("export A='x'\\''y'; run");
  expect(withEnvironment('run', { A: "x'y" }, 'powershell')).toContain("$env:A='x''y'; run");
  expect(withEnvironment('run', { A: 'x"y' }, 'cmd')).toContain('set "A=x""y" && run');
  expect(withEnvironment('run', undefined, undefined)).toBe('run');
  expect(withEnvironment('run', {}, 'cmd')).toBe('run');
  expect(quoteShell("C:\\temp\\it's", 'powershell')).toBe("'C:\\temp\\it''s'");
  expect(quoteShell('C:\\temp\\x"y', 'cmd')).toBe('"C:\\temp\\x""y"');
  expect(quoteShell("/tmp/it's", 'posix')).toBe("'/tmp/it'\\''s'");
  expect(() => withEnvironment('run', { A: 'x' }, 'invalid')).toThrow('envFallback');
  expect(() => withEnvironment('run', { 'BAD-NAME': 'x' }, 'posix')).toThrow('env');
  expect(() => withEnvironment('run', { A: {} }, 'posix')).toThrow('env');
});
