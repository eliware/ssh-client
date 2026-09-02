import { expect, jest, test } from '@jest/globals';
import { sshExec } from '../../../src/exec/runner/pipeline/execute.mjs';

test('validates execution options and cancellation', async () => {
  await expect(sshExec()).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ commands: [] })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', commandTimeout: 0, timeout: -1, ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', hostVerifier: 'invalid', ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  const controller = new AbortController(); controller.abort();
  await expect(sshExec({ host: 'x', commands: [], privateKey: 'KEY', signal: controller.signal, ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
});

test('rejects invalid commands, ports, output limits, and execution options', async () => {
  await expect(sshExec({ host: 'x', commands: [1], privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['ok'], port: 0, privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['ok', 1], privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['ok'], maxOutput: 0, privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['ok'], maxOutput: Infinity, privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['ok'], connectTimeout: 0, privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['ok'], commandTimeout: -1, privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(sshExec({ host: 'x', commands: ['ok'], cwd: 'safe; whoami', privateKey: 'KEY' })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
});
