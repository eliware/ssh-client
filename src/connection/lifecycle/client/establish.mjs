import { SshError } from '../../../errors.mjs';

const stop = client => { try { client.end(); } catch { client.destroy?.(); } };
export function establishClient(ClientClass, config, timeout) {
  return new Promise((resolve, reject) => {
    let client; let settled = false; let timer; let ready; let error; let end; let close;
    const finish = cause => { if (settled) return; settled = true; clearTimeout(timer); try { client?.removeListener?.('ready', ready); client?.removeListener?.('error', error); client?.removeListener?.('end', end); client?.removeListener?.('close', close); } catch {} if (cause) reject(cause); else resolve(client); };
    try { client = new ClientClass(); } catch (cause) { finish(new SshError(`SSH connection error: ${cause.message}`, 'SSH_CONNECTION', cause)); return; }
    if (typeof client.once !== 'function' || typeof client.connect !== 'function') return finish(new SshError('SSH client does not implement the required transport interface', 'SSH_CONNECTION'));
    ready = () => finish(); error = cause => finish(new SshError(`SSH connection error: ${cause.message}`, 'SSH_CONNECTION', cause)); end = () => finish(new SshError('SSH connection ended before ready', 'SSH_CONNECTION')); close = () => finish(new SshError('SSH connection closed before ready', 'SSH_CONNECTION'));
    client.once('ready', ready); if (typeof client.on === 'function') client.on('error', error); else client.once('error', error); client.once('end', end); client.once('close', close);
    timer = setTimeout(() => { finish(new SshError('SSH connection timed out', 'SSH_TIMEOUT')); stop(client); }, timeout);
    try { client.connect(config); } catch (cause) { finish(new SshError(`SSH connection error: ${cause.message}`, 'SSH_CONNECTION', cause)); }
  });
}
