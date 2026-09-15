import { expect, test } from '@jest/globals';
import { renderEnvironment } from '../../src/environment/render-environment.mjs';

test('renders supported environments and validates values', () => {
  expect(renderEnvironment('run', { A: "x'y" }, 'posix')).toContain("export A='x'\\''y'; run");
  expect(renderEnvironment('run', { A: "x'y" }, 'powershell')).toContain("$env:A='x''y'; run");
  expect(renderEnvironment('run', { A: 'x"y' }, 'cmd')).toContain('set "A=x""y" && run');
  expect(renderEnvironment('run', undefined, undefined)).toBe('run');
  expect(renderEnvironment('run', {}, 'cmd')).toBe('run');
  expect(() => renderEnvironment('run', { A: 'x' }, 'invalid')).toThrow('envFallback');
  expect(() => renderEnvironment('run', { 'BAD-NAME': 'x' }, 'posix')).toThrow('env');
  expect(() => renderEnvironment('run', { A: {} }, 'posix')).toThrow('env');
  expect(() => renderEnvironment('run', { VALUE: '%PATH%' }, 'cmd')).toThrow('expansion');
  expect(() => renderEnvironment('run', { VALUE: '!secret!' }, 'cmd')).toThrow('expansion');
});
