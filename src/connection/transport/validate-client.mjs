import { SshError } from '../../errors.mjs';

export function validateClientTransport(client) {
  if (typeof client.once !== 'function' || typeof client.connect !== 'function') throw new SshError('SSH client does not implement the required transport interface', 'SSH_CONNECTION');
}
