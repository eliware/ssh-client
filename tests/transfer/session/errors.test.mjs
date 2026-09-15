import { expect, test } from '@jest/globals';
import { cancellationError, normalizeTransferError, timeoutError, transferSetupError } from '../../../src/transfer/session/errors.mjs';

test('normalizes setup, transfer, cancellation, and timeout errors', () => { expect(transferSetupError('upload', undefined, undefined)).toMatchObject({ code: 'SSH_SFTP' }); expect(normalizeTransferError('upload', Error('failed'))).toMatchObject({ code: 'SSH_TRANSFER' }); expect(cancellationError('upload')).toMatchObject({ code: 'SSH_CANCELLED' }); expect(timeoutError('upload')).toMatchObject({ code: 'SSH_TIMEOUT' }); });
