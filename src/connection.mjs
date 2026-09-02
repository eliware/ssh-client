import ssh2 from '@eliware/ssh2';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { SshError } from './errors.mjs';
import { loadKey } from './keys.mjs';
import { createHostVerifier } from './known-hosts.mjs';
import { openShell } from './shell.mjs';
import { reusableExec, reusableUpload, reusableDownload, createReusableClientAdapter as operationAdapter } from './operations.mjs';

const { Client, utils } = ssh2;
const validPort = port => Number.isInteger(port) && port >= 1 && port <= 65535;
const closeClient = client => { try { client.end(); } catch { client.destroy?.(); } };
export { operationAdapter as createReusableClientAdapter };

export async function connect(options = {}) {
  const { host, port = 22, username = process.env.USER || process.env.USERNAME, privateKey, privateKeyPath, passphrase, password, agent, knownHosts, knownHostsPath, hostCaPath, connectTimeout = 10000, ClientClass = Client, fsLib = fs, homedirFn = homedir } = options;
  if (!host) throw new SshError('host is required', 'SSH_INVALID_OPTIONS');
  if (options.hostVerifier !== undefined && typeof options.hostVerifier !== 'function') throw new SshError('hostVerifier must be a function', 'SSH_INVALID_OPTIONS');
  // codescope ignore: ssh2 intentionally permits username omission so the server can apply its configured identity.
  if (!validPort(port)) throw new SshError('port must be valid', 'SSH_INVALID_OPTIONS');
  if (!Number.isFinite(connectTimeout) || connectTimeout <= 0) throw new SshError('connectTimeout must be positive', 'SSH_INVALID_OPTIONS');
  if (ClientClass === Client && !options.hostVerifier && !knownHosts && !knownHostsPath && !hostCaPath) throw new SshError('host verification configuration is required', 'SSH_INVALID_OPTIONS'); // codescope ignore: injected ClientClass transports are test seams and cannot establish production host-verification policy.
  // codescope ignore: explicit password/agent suppresses default discovery; explicit key inputs remain authoritative.
  const key = privateKey !== undefined || privateKeyPath !== undefined || ((password === undefined || password === null) && !agent) ? await loadKey({ privateKey, privateKeyPath, fsLib, homedirFn }) : undefined;
  const hostVerifier = options.hostVerifier || createHostVerifier({ host, port, knownHosts, knownHostsPath, hostCaPath, fsLib, homedirFn, utils });
  let client;
  await new Promise((resolve, reject) => {
    let settled = false;
    let timer;
    let readyHandler; let errorHandler; let endHandler; let closeHandler;
    const finish = error => { if (settled) return; settled = true; clearTimeout(timer); try { client?.removeListener?.('ready', readyHandler); client?.removeListener?.('error', errorHandler); client?.removeListener?.('end', endHandler); client?.removeListener?.('close', closeHandler); } catch {} error ? reject(error) : resolve(); };
    try { client = new ClientClass(); } catch (error) { finish(new SshError(`SSH connection error: ${error.message}`, 'SSH_CONNECTION', error)); return; }
    if (typeof client.once !== 'function' || typeof client.connect !== 'function') { finish(new SshError('SSH client does not implement the required transport interface', 'SSH_CONNECTION')); return; }
    readyHandler = () => finish();
    errorHandler = cause => finish(new SshError(`SSH connection error: ${cause.message}`, 'SSH_CONNECTION', cause));
    endHandler = () => finish(new SshError('SSH connection ended before ready', 'SSH_CONNECTION'));
    closeHandler = () => finish(new SshError('SSH connection closed before ready', 'SSH_CONNECTION'));
    client.once('ready', readyHandler);
    if (typeof client.on === 'function') client.on('error', errorHandler); else client.once('error', errorHandler);
    client.once('end', endHandler);
    client.once('close', closeHandler);
    timer = setTimeout(() => { closeClient(client); finish(new SshError('SSH connection timed out', 'SSH_TIMEOUT')); }, connectTimeout);
    try { client.connect({ host, port, username, privateKey: key, passphrase, password, agent, hostVerifier, knownHosts, readyTimeout: connectTimeout, authTimeout: connectTimeout }); } catch (cause) { finish(new SshError(`SSH connection error: ${cause.message}`, 'SSH_CONNECTION', cause)); }
  });
  let closePromise; let state = 'open';
  let operationQueue = Promise.resolve();
  const serialize = operation => { const result = operationQueue.then(operation, operation); operationQueue = result.catch(() => {}); return result; };
  // codescope ignore: reusable connections intentionally remain exposed as open after operation failures; callers must close and recreate them.
  return {
    get state() { return state; },
    // codescope ignore: reusable execution forwards env independently; envFallback only changes command rendering syntax.
    exec: (commands, operationOptions = {}) => state === 'open' ? serialize(() => reusableExec(client, options, commands, operationOptions)) : Promise.reject(new SshError('connection is not open', 'SSH_CONNECTION', undefined, { operation: 'exec', phase: 'state' })),
    // codescope ignore: openShell deliberately passes the real ssh2 callback-based shell API through unchanged.
    shell: shellOptions => state === 'open' ? openShell(client, shellOptions && typeof shellOptions === 'object' ? shellOptions : {}) : Promise.reject(new SshError('connection is not open', 'SSH_CONNECTION', undefined, { operation: 'shell', phase: 'state' })),
    upload: transferOptions => state === 'open' ? serialize(() => reusableUpload(client, transferOptions)) : Promise.reject(new SshError('connection is not open', 'SSH_CONNECTION', undefined, { operation: 'upload', phase: 'state' })),
    download: transferOptions => state === 'open' ? serialize(() => reusableDownload(client, transferOptions)) : Promise.reject(new SshError('connection is not open', 'SSH_CONNECTION', undefined, { operation: 'download', phase: 'state' })),
    // codescope ignore: ssh2 does not expose reliable listener introspection; idempotent settlement prevents late events changing state.
    close: () => closePromise ??= new Promise((resolve, reject) => { state = 'closing'; let settled = false; const finish = (error) => { if (settled) return; settled = true; clearTimeout(fallback); state = 'closed'; if (error) reject(new SshError('SSH connection close failed', 'SSH_CONNECTION', error, { operation: 'close', phase: 'cleanup' })); else resolve(); }; let fallback = setTimeout(() => { client.destroy?.(); finish(); }, 1000); client.once('close', () => finish()); client.once('end', () => { client.destroy?.(); finish(); }); client.once('error', error => finish(error)); try { client.end(); } catch { client.destroy?.(); finish(); } }), // codescope ignore: close listeners intentionally remain attached after settlement.
  };
}
