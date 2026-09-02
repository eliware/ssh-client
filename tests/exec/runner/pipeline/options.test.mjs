import { expect, test } from '@jest/globals';
import { prepareExecution } from '../../../../src/exec/runner/pipeline/options.mjs';

test('prepares normalized execution defaults and timeout override', async () => {
  const ClientClass = class {};
  const config = await prepareExecution({ host: 'router', commands: ['run'], privateKey: 'KEY', timeout: 25, ClientClass });
  expect(config).toMatchObject({ host: 'router', port: 22, commands: ['run'], commandTimeout: 25, connectTimeout: 10000, pty: false, keepAlive: false });
  expect(config.verifier).toEqual(expect.any(Function));
});

test('rejects aborted execution during option preparation', async () => {
  const controller = new AbortController(); controller.abort();
  await expect(prepareExecution({ host: 'router', commands: [], privateKey: 'KEY', signal: controller.signal, ClientClass: class {} })).rejects.toMatchObject({ code: 'SSH_CANCELLED' });
});
