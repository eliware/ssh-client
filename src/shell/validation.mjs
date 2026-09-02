import { SshError } from '../errors.mjs';

export function validateShellTimeout(timeout) {
  if (!Number.isFinite(timeout) || timeout < 0) throw new SshError('shell timeout must be non-negative', 'SSH_INVALID_OPTIONS', undefined, { operation: 'shell', phase: 'options' });
}
