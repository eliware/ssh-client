import ssh2 from '@eliware/ssh2';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { SshError } from './errors.mjs';
import { loadKey } from './keys.mjs';
import { createHostVerifier } from './known-hosts.mjs';

const { Client, utils } = ssh2;

function validateOptions({ host, port, commands, maxOutput, cwd, connectTimeout, commandTimeout }) {
  if (!host || !Array.isArray(commands)) throw new SshError('host and commands[] are required', 'SSH_INVALID_OPTIONS');
  if (!commands.every(command => typeof command === 'string')) throw new SshError('commands[] must contain only strings', 'SSH_INVALID_OPTIONS');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new SshError('port must be valid', 'SSH_INVALID_OPTIONS');
  if (!Number.isFinite(maxOutput) || maxOutput <= 0) throw new SshError('maxOutput must be a positive number', 'SSH_INVALID_OPTIONS');
  if (!Number.isFinite(connectTimeout) || connectTimeout <= 0) throw new SshError('connectTimeout must be positive', 'SSH_INVALID_OPTIONS');
  if (!Number.isFinite(commandTimeout) || commandTimeout < 0) throw new SshError('commandTimeout must be non-negative', 'SSH_INVALID_OPTIONS');
  if (cwd !== undefined && (typeof cwd !== 'string' || !/^[A-Za-z0-9_ ./\\:-]+$/.test(cwd))) {
    throw new SshError('cwd contains unsupported shell characters', 'SSH_INVALID_OPTIONS');
  }
}

export async function sshExec(options = {}) {
  const {
    host, port = 22, username = process.env.USER || process.env.USERNAME, commands,
    ClientClass = Client, fsLib = fs, homedirFn = homedir, privateKey, privateKeyPath,
    passphrase, password, agent, hostVerifier, knownHosts, connectTimeout = 10000,
    commandTimeout = 0, maxOutput = 1000000, cwd, env, pty = false, shell = false, keepAlive = false,
    knownHostsPath, hostCaPath,
  } = options;
  validateOptions({ host, port, commands, maxOutput, cwd, connectTimeout, commandTimeout });
  const key = await loadKey({ privateKey, privateKeyPath, fsLib, homedirFn });
  const verifier = hostVerifier || ((knownHosts || knownHostsPath || hostCaPath)
    ? createHostVerifier({ host, port, knownHosts, knownHostsPath, hostCaPath, fsLib, homedirFn, utils })
    : undefined);
  return new Promise((resolve, reject) => {
    const conn = new ClientClass();
    const results = [];
    let index = 0;
    let ended = false;
    let commandStarting = false;
    let transportClosed = false;
    let connectionTimer;

    const finish = error => {
      clearTimeout(connectionTimer);
      if (error) {
        if (!ended && !transportClosed) { ended = true; conn.end(); }
        reject(error);
      } else {
        /* istanbul ignore next -- normal success owns the live connection; remote end races are handled by the end listener. */
        if (!ended && !keepAlive) { ended = true; conn.end(); }
        resolve(results);
      }
    };

    const next = () => {
      if (index >= commands.length) return finish();
      const command = commands[index++];
      const started = Date.now();
      let stdout = '';
      let stderr = '';
      let commandTimer;
      let completed = false;
      commandStarting = true;
      // cwd is validated to a shell-safe cross-platform character set before interpolation.
      const full = cwd ? `cd ${JSON.stringify(cwd)} && ${command}` : command;
      const done = (error, stream) => {
        commandStarting = false;
        clearTimeout(commandTimer);
        if (error) return finish(new SshError(`SSH exec error: ${error.message}`, 'SSH_EXEC', error));
        if (commandTimeout > 0) commandTimer = setTimeout(() => {
          /* istanbul ignore next -- clearTimeout prevents this callback after normal stream completion. */
          if (completed) return;
          completed = true;
          stream.close?.();
          finish(new SshError(`SSH command timed out: ${command}`, 'SSH_COMMAND_TIMEOUT'));
        }, commandTimeout);
        const add = (target, data) => {
          const text = String(data);
          const current = stdout.length + stderr.length;
          if (current >= maxOutput) return;
          const value = text.slice(0, maxOutput - current);
          if (target === 'stdout') stdout += value; else stderr += value;
        };
        stream.on('close', (code, signal) => {
          if (completed) return;
          completed = true;
          clearTimeout(commandTimer);
          results.push({ command, stdout, stderr, result: stdout + stderr, code, signal, duration: Date.now() - started });
          next();
        }).on('data', data => add('stdout', data));
        stream.stderr.on('data', data => add('stderr', data));
      };
      if (commandTimeout > 0) commandTimer = setTimeout(() => {
        /* istanbul ignore next -- command completion clears this timer before it can fire. */
        if (completed) return;
        completed = true;
        finish(new SshError(`SSH command timed out: ${command}`, 'SSH_COMMAND_TIMEOUT'));
      }, commandTimeout);
      try {
        if (env || pty) conn.exec(full, { env, pty }, done); else conn.exec(full, done);
      } catch (error) { finish(new SshError(`SSH exec error: ${error.message}`, 'SSH_EXEC', error)); }
      commandStarting = false;
    };

    const connectionError = error => {
      if (ended) return;
      const code = error.level === 'client-authentication' ? 'SSH_AUTHENTICATION' : error.level === 'client-timeout' ? 'SSH_TIMEOUT' : 'SSH_CONNECTION';
      const message = code === 'SSH_AUTHENTICATION' ? 'authentication failed' : code === 'SSH_TIMEOUT' ? 'connection timed out' : 'connection error';
      finish(new SshError(`SSH ${message}: ${error.message}`, code, error));
    };

    const connectionClosed = () => {
      transportClosed = true;
      if (commandStarting) {
        queueMicrotask(connectionClosed);
        return;
      }
      if (!ended) finish(new SshError('SSH connection closed unexpectedly', 'SSH_CONNECTION'));
    };
    conn.on('ready', () => { clearTimeout(connectionTimer); next(); })
      .on('error', connectionError)
      .on('end', connectionClosed)
      .on('close', connectionClosed);
    connectionTimer = setTimeout(() => connectionError({ level: 'client-timeout', message: 'connection timeout' }), connectTimeout);
    conn.connect({ host, port, username, privateKey: key, passphrase, password, agent, hostVerifier: verifier, knownHosts, readyTimeout: connectTimeout, shell });
  });
}
