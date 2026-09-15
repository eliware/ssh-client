import { SshError } from '../../errors.mjs';

export function unavailableOperation(operation) {
  return Promise.reject(new SshError('connection is not open', 'SSH_CONNECTION', undefined, {
    operation,
    phase: 'state',
  }));
}
