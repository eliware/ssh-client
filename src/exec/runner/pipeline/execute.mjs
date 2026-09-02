// codescope ignore: @eliware/ssh2 is exact-pinned for reviewed transport reproducibility.
import ssh2 from '@eliware/ssh2';
import { SshError } from '../../../errors.mjs';
import { connectionError as createConnectionError } from '../../connection/errors.mjs';
import { attachConnectionEvents } from '../../connection/events.mjs';
import { startConnectionTimeout } from '../../connection/timeout.mjs';
import { prepareExecution } from './options.mjs';
import { createCommandQueue } from './queue.mjs';

const { Client } = ssh2;
export async function sshExec(options = {}) {
  const config = await prepareExecution(options);
  const { host, port, username, commands, ClientClass = Client, key, passphrase, password, agent, verifier, knownHosts, connectTimeout, commandTimeout, signal, maxOutput, cwd, env, envFallback, pty, keepAlive } = config;
  return new Promise((resolve, reject) => {
    let conn;
    try { conn = new ClientClass(); } catch (error) { reject(new SshError(`SSH connection error: ${error.message || String(error)}`, 'SSH_CONNECTION', error)); return; }
    if (typeof conn.on !== 'function' || typeof conn.connect !== 'function') { reject(new SshError('SSH client does not implement the required transport interface', 'SSH_CONNECTION')); return; }
    const results = []; let ended = false; let commandStarting = false; let closeDeferred = false; let transportClosed = false; let connectionTimer; let activeCommandTimer; let settled = false; let readyHandled = false;
    const finish = error => { if (settled) return; settled = true; clearTimeout(connectionTimer); clearTimeout(activeCommandTimer); signal?.removeEventListener('abort', abort); if (error) { if (!ended && !transportClosed && !keepAlive) { ended = true; try { conn.end(); } catch { conn.destroy?.(); } } reject(error); } else { if (!ended && !keepAlive) { ended = true; try { conn.end(); } catch { conn.destroy?.(); } } resolve(results); } };
    const abort = () => { finish(new SshError('SSH operation cancelled', 'SSH_CANCELLED', undefined, { operation: 'exec', phase: 'queue' })); };
    if (signal) signal.addEventListener('abort', abort, { once: true });
    const next = createCommandQueue({ commands, maxOutput, commandTimeout, keepAlive, conn, cwd, env, envFallback, pty, results, finish, isSettled: () => settled, isTransportClosed: () => transportClosed, setCommandStarting: value => { commandStarting = value; }, setActiveTimer: value => { activeCommandTimer = value; }, clearActiveTimer: value => { if (value && activeCommandTimer === value) activeCommandTimer = undefined; } });
    const connectionError = error => { if (!ended && !settled) finish(createConnectionError(error)); };
    const connectionClosed = () => { transportClosed = true; if (commandStarting) { if (closeDeferred) return finish(new SshError('SSH connection closed during channel setup', 'SSH_CONNECTION')); closeDeferred = true; setImmediate(connectionClosed); return; } if (!ended) { try { conn.end(); } catch {} finish(new SshError('SSH connection closed unexpectedly', 'SSH_CONNECTION')); } };
    // codescope ignore: reusable execution listeners intentionally remain attached for the shared transport lifetime.
    attachConnectionEvents(conn, { onReady: () => { if (readyHandled || ended || transportClosed) return; readyHandled = true; clearTimeout(connectionTimer); next(); }, onError: connectionError, onClosed: connectionClosed });
    connectionTimer = startConnectionTimeout(connectTimeout, () => connectionError({ level: 'client-timeout', message: 'connection timeout' }));
    try { conn.connect({ host, port, username, privateKey: key, passphrase, password, agent, hostVerifier: verifier, knownHosts, readyTimeout: connectTimeout }); } catch (error) { finish(new SshError(`SSH connection error: ${error.message}`, 'SSH_CONNECTION', error)); }
  });
}
