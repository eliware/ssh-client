import { expect, test } from '@jest/globals';
import { connectionError } from '../../../src/exec/connection/errors.mjs';

test('maps transport error levels to SSH error codes', () => {
  expect(connectionError({ level: 'client-authentication', message: 'failed' })).toMatchObject({ code: 'SSH_AUTHENTICATION' });
  expect(connectionError({ level: 'client-timeout', message: 'failed' })).toMatchObject({ code: 'SSH_TIMEOUT' });
  expect(connectionError({ message: 'failed' })).toMatchObject({ code: 'SSH_CONNECTION' });
  expect(connectionError({})).toMatchObject({ code: 'SSH_CONNECTION' });
});
