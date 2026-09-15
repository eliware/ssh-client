import { SshError } from '../errors.mjs';

export function requestShell(client, onResult, onError) {
  try {
    client.shell(onResult);
  } catch (cause) {
    onError(new SshError(`SSH shell error: ${cause.message || String(cause)}`, 'SSH_SHELL', cause, { operation: 'shell', phase: 'setup' }));
  }
}
