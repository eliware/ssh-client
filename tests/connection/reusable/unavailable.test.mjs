import { expect, test } from '@jest/globals';
import { unavailableOperation } from '../../../src/connection/reusable/unavailable.mjs';

test('rejects with a connection state error', async () => {
  await expect(unavailableOperation('exec')).rejects.toMatchObject({
    code: 'SSH_CONNECTION',
    context: { operation: 'exec', phase: 'state' },
  });
});
