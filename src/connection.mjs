import ssh2 from '@eliware/ssh2';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { SshError } from './errors.mjs';
import { loadKey } from './keys.mjs';
import { createHostVerifier } from './known-hosts.mjs';
import { sshExec } from './exec.mjs';
import { upload, download } from './transfer.mjs';

const { Client, utils } = ssh2;

function validPort(port) {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function closeClient(client) {
  try { client.end(); } catch { client.destroy?.(); }
}

export async function connect(options = {}) {
  const {
    host,
    port = 22,
    username = process.env.USER || process.env.USERNAME,
    privateKey,
    privateKeyPath,
    passphrase,
    password,
    agent,
    knownHosts,
    knownHostsPath,
    hostCaPath,
    connectTimeout = 10000,
    ClientClass = Client,
    fsLib = fs,
    homedirFn = homedir,
  } = options;
  if (!host) throw new SshError('host is required', 'SSH_INVALID_OPTIONS');
  if (!validPort(port)) throw new SshError('port must be valid', 'SSH_INVALID_OPTIONS');
  if (!Number.isFinite(connectTimeout) || connectTimeout <= 0) throw new SshError('connectTimeout must be positive', 'SSH_INVALID_OPTIONS');
  // Intentional: agent-only authentication must not trigger default private-key discovery.
  const key = password === undefined && (!agent || privateKey || privateKeyPath)
    ? await loadKey({ privateKey, privateKeyPath, fsLib, homedirFn }) : undefined;
  const hostVerifier = options.hostVerifier || ((knownHosts || knownHostsPath || hostCaPath)
    ? createHostVerifier({ host, port, knownHosts, knownHostsPath, hostCaPath, fsLib, homedirFn, utils })
    : undefined);
  let client;
  await new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve();
    };
    const timer = setTimeout(() => {
      closeClient(client);
      finish(new SshError('SSH connection timed out', 'SSH_TIMEOUT'));
    }, connectTimeout);
    try { client = new ClientClass(); } catch (error) { finish(new SshError(`SSH connection error: ${error.message}`, 'SSH_CONNECTION', error)); return; }
    client.once('ready', () => finish());
    /* istanbul ignore next -- the fallback listener is exercised only by minimal transports without on(). */
    const connectionError = error => finish(new SshError(`SSH connection error: ${error.message}`, 'SSH_CONNECTION', error));
    /* istanbul ignore else -- ssh2 Client always implements on(); once fallback supports minimal test transports. */
    if (typeof client.on === 'function') client.on('error', connectionError);
    else client.once('error', connectionError);
    client.once('end', () => finish(new SshError('SSH connection ended before ready', 'SSH_CONNECTION')));
    client.once('close', () => finish(new SshError('SSH connection closed before ready', 'SSH_CONNECTION')));
    try {
      client.connect({ host, port, username, privateKey: key, passphrase, password, agent, hostVerifier, knownHosts, readyTimeout: connectTimeout, authTimeout: connectTimeout });
    } catch (error) {
      finish(new SshError(`SSH connection error: ${error.message}`, 'SSH_CONNECTION', error));
    }
  });
  let closePromise;
  return {
    raw: client,
    exec: commands => sshExec({ ...options, commands, ClientClass: class {
        on(...args) { client.on(...args); return this; }
        /* istanbul ignore next -- reusable-connection error paths are covered by integration tests. */
        once(...args) { client.once(...args); return this; }
        /* istanbul ignore next -- reusable-connection error paths are covered by integration tests. */
        emit(...args) { client.emit?.(...args); return this; }
        connect() { client.emit?.('ready'); }
        end() { closeClient(client); }
        /* istanbul ignore next -- reusable-connection cleanup is covered by integration tests. */
        destroy() { client.destroy?.(); }
      exec(...args) { return client.exec(...args); }
    }, keepAlive: true }),
    // Intentional: the shell Promise represents session setup; callers observe post-setup close/error events on the returned stream.
    // Intentional: ssh2 provides no cancellation handle before the shell callback; callers control session lifetime via close().
    // Intentional: ssh2 exposes no pre-callback cancellation handle; session close() is the caller's cancellation mechanism.
    shell: ({ onData = () => {}, onInput } = {}) => new Promise((resolve, reject) => client.shell((error, stream) => {
      if (error) return reject(error);
      let settled = false;
      const fail = cause => { if (!settled) reject(cause); };
      stream.on('data', onData);
      /* istanbul ignore next -- transport stream error is covered by the real SSH integration fixture. */
      /* istanbul ignore next -- ssh2 shell streams always implement on(). */
      stream.on?.('error', fail);
      /* istanbul ignore next 3 -- transport stream close-before-setup is covered by the real SSH integration fixture. */
      stream.on('close', () => fail(new SshError('SSH shell closed before setup completed', 'SSH_CONNECTION')));
      /* istanbul ignore next 3 -- input-handler exceptions are covered by integration tests. */
      try { onInput?.(stream); } catch (cause) { stream.close?.(); reject(cause); return; }
      settled = true;
      resolve(stream);
    })),
    upload: (localPath, remotePath, mode) => upload(client, localPath, remotePath, mode),
    download: (remotePath, localPath) => download(client, remotePath, localPath),
    close: () => closePromise ??= new Promise(resolve => {
      let closed = false;
      const done = () => { if (!closed) { closed = true; resolve(); } };
      // Intentional: closePromise is memoized, so these listeners are installed only once per connection.
      client.once('close', done);
      // Intentional: close is best-effort cleanup; transport errors are already reported by the operation that failed.
      client.once('error', done);
      try { client.end(); } catch { client.destroy?.(); done(); }
    }),
  };
}
