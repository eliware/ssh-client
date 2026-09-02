import { SshError } from '../errors.mjs';

export function runTransfer(client, config, operation, start) {
  const { signal, timeout = 0 } = config;
  return new Promise((resolve, reject) => {
    let timer; let settled = false; let sftp;
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); };
    const finish = (error, result) => { if (settled) return; settled = true; cleanup(); try { sftp?.end?.(); } catch (cause) { if (!error) error = new SshError(`${operation} session close failed`, 'SSH_SFTP', cause, { operation, phase: 'cleanup' }); } if (!error) return resolve(result); if (error instanceof SshError) return reject(error); reject(new SshError(`${operation} failed: ${error.message || String(error)}`, 'SSH_TRANSFER', error, { operation, phase: 'transfer' })); };
    const cancel = () => { try { sftp?.end?.(); } catch {} finish(new SshError(`${operation} cancelled`, 'SSH_CANCELLED', undefined, { operation, phase: 'transfer' })); };
    if (signal?.aborted) return cancel(); signal?.addEventListener('abort', cancel, { once: true });
    if (timeout > 0) timer = setTimeout(() => { try { sftp?.end?.(); } catch {} finish(new SshError(`${operation} timed out`, 'SSH_TIMEOUT', undefined, { operation, phase: 'transfer' })); }, timeout);
    try { client.sftp((error, handle) => { if (settled) { try { handle?.end?.(); } catch {} return; } if (error || !handle) return finish(new SshError(`${operation} setup failed: ${error?.message || (error ? String(error) : 'missing SFTP handle')}`, 'SSH_SFTP', error, { operation, phase: 'setup' })); sftp = handle; try { start(sftp, finish); } catch (cause) { finish(cause); } }); } catch (cause) { finish(new SshError(`${operation} setup failed: ${cause.message || String(cause)}`, 'SSH_SFTP', cause, { operation, phase: 'setup' })); }
  });
}
