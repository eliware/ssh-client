import { SshError } from '../../../errors.mjs';
import { prepareExecution } from './options.mjs';
import { createCommandQueue } from './queue.mjs';
import { completeExecution } from './completion.mjs';
import { createFinisher } from './finisher.mjs';
import { startExecutionConnection } from './connection.mjs';
import { createExecutionConnectionEvents } from './connection-events.mjs';

export async function sshExec(options = {}) {
  if (options.signal?.aborted) throw new SshError('SSH operation cancelled', 'SSH_CANCELLED', undefined, { operation: 'exec', phase: 'options' });
  let earlyAborted = false;
  const earlyAbort = () => { earlyAborted = true; };
  options.signal?.addEventListener('abort', earlyAbort, { once: true });
  const config = await prepareExecution(options);
  options.signal?.removeEventListener('abort', earlyAbort);
  if (earlyAborted) throw new SshError('SSH operation cancelled', 'SSH_CANCELLED', undefined, { operation: 'exec', phase: 'options' });
  const { commands, commandTimeout, signal, maxOutput, cwd, env, envFallback, pty, keepAlive } = config;
  return new Promise((resolve, reject) => {
    let conn; const results = []; let ended = false; let commandStarting = false; let closeDeferred = false; let transportClosed = false; let connectionTimer; let activeCommandTimer; let settled = false; let readyHandled = false;
    const finish = createFinisher({ get value() { return settled; }, set value(value) { settled = value; } }, error => completeExecution({ error, state: { get ended() { return ended; }, set ended(value) { ended = value; }, transportClosed }, connectionTimer, activeCommandTimer, signal, abort, conn, keepAlive, results, resolve, reject }));
    const abort = () => { finish(new SshError('SSH operation cancelled', 'SSH_CANCELLED', undefined, { operation: 'exec', phase: 'queue' })); };
    if (signal) signal.addEventListener('abort', abort, { once: true });
    const next = createCommandQueue({ commands, maxOutput, commandTimeout, keepAlive, get conn() { return conn; }, cwd, env, envFallback, pty, results, finish, isSettled: () => settled, isTransportClosed: () => transportClosed, setCommandStarting: value => { commandStarting = value; }, setActiveTimer: value => { activeCommandTimer = value; }, clearActiveTimer: value => { if (value && activeCommandTimer === value) activeCommandTimer = undefined; } });
    const connectionEvents = createExecutionConnectionEvents({ getConn: () => conn, finish, isEnded: () => ended, isSettled: () => settled, setTransportClosed: value => { transportClosed = value; }, isCommandStarting: () => commandStarting, isCloseDeferred: () => closeDeferred, deferClose: () => { closeDeferred = true; } });
    try {
      const connection = startExecutionConnection(config, { onReady: () => { if (readyHandled || ended || transportClosed) return; readyHandled = true; clearTimeout(connectionTimer); next(); }, onError: connectionEvents.onError, onClosed: connectionEvents.onClosed, onTimeout: () => connectionEvents.onError({ level: 'client-timeout', message: 'connection timeout' }), onConnectError: finish });
      conn = connection.conn;
      connectionTimer = connection.timer;
      connection.connect();
    } catch (error) { finish(error); }
  });
}
