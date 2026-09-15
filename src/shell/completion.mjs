import { SshError } from '../errors.mjs';

export function completeShellSetup({ error, stream, settled, stop, attach, resolve, reject }) {
  if (settled() || !stream && error === undefined) {
    stream?.close?.();
    return false;
  }
  stop();
  if (error) {
    reject(error instanceof SshError ? error : new SshError(`SSH shell error: ${error.message || String(error)}`, 'SSH_SHELL', error, { operation: 'shell', phase: 'setup' }));
    return false;
  }
  try {
    attach(stream);
    resolve(stream);
    return true;
  } catch (cause) {
    reject(cause);
    return false;
  }
}
