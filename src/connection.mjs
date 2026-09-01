import ssh2 from 'ssh2';
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
  const key = password === undefined ? await loadKey({ privateKey, privateKeyPath, fsLib, homedirFn }) : undefined;
  const hostVerifier = options.hostVerifier || ((knownHosts || knownHostsPath || hostCaPath)
    ? createHostVerifier({ host, port, knownHosts, knownHostsPath, hostCaPath, fsLib, homedirFn, utils })
    : undefined);
  const client = new ClientClass();
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
    client.once('ready', () => finish());
    const connectionError = error => finish(new SshError(`SSH connection error: ${error.message}`, 'SSH_CONNECTION', error));
    client.on?.('error', connectionError) ?? client.once('error', connectionError);
    client.once('end', () => finish(new SshError('SSH connection ended before ready', 'SSH_CONNECTION')));
    client.once('close', () => finish(new SshError('SSH connection closed before ready', 'SSH_CONNECTION')));
    client.connect({ host, port, username, privateKey: key, passphrase, password, agent, hostVerifier, knownHosts, readyTimeout: connectTimeout, authTimeout: connectTimeout });
  });
  let closePromise;
  return {
    raw: client,
    exec: commands => sshExec({ ...options, commands, ClientClass: class {
      on(...args) { client.on(...args); return this; }
      connect() { client.emit?.('ready'); }
      end() { closeClient(client); }
      exec(...args) { return client.exec(...args); }
    }, keepAlive: true }),
    shell: ({ onData = () => {}, onInput } = {}) => new Promise((resolve, reject) => client.shell((error, stream) => {
      if (error) return reject(error);
      stream.on('data', onData);
      onInput?.(stream);
      resolve(stream);
    })),
    upload: (localPath, remotePath, mode) => upload(client, localPath, remotePath, mode),
    download: (remotePath, localPath) => download(client, remotePath, localPath),
    close: () => closePromise ??= new Promise(resolve => {
      let closed = false;
      const done = () => { if (!closed) { closed = true; resolve(); } };
      client.once('close', done);
      client.once('error', done);
      try { client.end(); } catch { client.destroy?.(); done(); }
    }),
  };
}
