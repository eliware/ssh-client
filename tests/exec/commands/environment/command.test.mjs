import { expect, test } from '@jest/globals';
import { buildCommand } from '../../../../src/exec/commands/environment/command.mjs';

test('builds commands with environment fallbacks and safe quoting', () => {
  expect(buildCommand('run', { env: { KNIT_TEST: "a'b" }, envFallback: 'posix' })).toContain("export KNIT_TEST='a'\\''b'; run");
  expect(buildCommand('run', { cwd: 'C:\\temp\\dir', env: { KNIT_TEST: 'yes' }, envFallback: 'powershell' })).toContain("Set-Location 'C:\\temp\\dir'");
  expect(buildCommand('run', { cwd: '/tmp' })).toBe("cd '/tmp' && run");
  expect(buildCommand('run', { cwd: 'C:\\temp', envFallback: 'cmd' })).toContain('cd /d "C:\\temp"');
});
