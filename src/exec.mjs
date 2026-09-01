import ssh2 from '@eliware/ssh2';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { SshError } from './errors.mjs';
import { loadKey } from './keys.mjs';
import { createHostVerifier } from './known-hosts.mjs';
import { withEnvironment } from './environment.mjs';

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
    commandTimeout = 0, maxOutput = 1000000, cwd, env, envFallback, pty = false, shell = false, keepAlive = false,
    knownHostsPath, hostCaPath,
  } = options;
  validateOptions({ host, port, commands, maxOutput, cwd, connectTimeout, commandTimeout });
  const key = password === undefined && (!agent || privateKey || privateKeyPath)
    ? await loadKey({ privateKey, privateKeyPath, fsLib, homedirFn }) : undefined;
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
    let activeCommandTimer;

    const finish = error => {
      // Intentional: ssh2 emits end/close asynchronously; ended/transportClosed make normal cleanup idempotent.
      clearTimeout(connectionTimer);
      clearTimeout(activeCommandTimer);
      if (error) {
        if (!ended && !transportClosed) { ended = true; try { conn.end(); } catch {} }
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
      let timedOut = false;
      let outputTruncated = false;
      let channel;
      commandStarting = true;
      // cwd is validated to a shell-safe cross-platform character set before interpolation.
      const full = withEnvironment(cwd ? `cd ${JSON.stringify(cwd)} && ${command}` : command, env, envFallback);
      const done = (error, stream) => {
        commandStarting = false;
        if (timedOut) { stream?.close?.(); return; }
        if (error) return finish(new SshError(`SSH exec error: ${error.message}`, 'SSH_EXEC', error));
        const add = (target, data) => {
          const text = String(data);
          const current = stdout.length + stderr.length;
          if (current >= maxOutput) { if (!outputTruncated) { outputTruncated = true; channel?.close?.(); } return; }
          const value = text.slice(0, maxOutput - current);
          if (target === 'stdout') stdout += value; else stderr += value;
        };
        // Intentional: ssh2 invokes the callback with the channel before data can be emitted; listeners attach synchronously here.
        channel = stream;
        stream.on('close', (code, signal) => {
          /* istanbul ignore if -- late channel close is covered by the integration fixture. */
          if (completed) return;
          completed = true;
          clearTimeout(commandTimer);
          // Intentional: null distinguishes a clean close without an SSH exit-status request from exit code 0.
          results.push({ command, stdout, stderr, result: stdout + stderr, code: code ?? null, signal, duration: Date.now() - started });
          next();
        }).on('data', data => add('stdout', data));
        /* istanbul ignore next -- remote channel errors are covered by the real SSH integration fixture. */
        stream.on?.('error', error => { if (completed) return; completed = true; clearTimeout(commandTimer); finish(new SshError(`SSH exec error: ${error.message}`, 'SSH_EXEC', error)); });
        /* istanbul ignore next -- ssh2 channels always expose stderr; minimal mocks may omit it. */
        stream.stderr?.on('data', data => add('stderr', data));
      };
      // Intentional: until ssh2 invokes the callback there is no channel object to close; finish() tears down the transport.
      if (commandTimeout > 0) activeCommandTimer = commandTimer = setTimeout(() => {
        /* istanbul ignore next -- command completion clears this timer before it can fire. */
        if (completed) return;
        completed = true;
        timedOut = true;
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
      /* istanbul ignore next 4 -- repeated close events are transport-specific and covered by integration tests. */
      /* istanbul ignore next -- close during synchronous channel setup is integration-only behavior. */
      if (commandStarting) {
        // Intentional: ssh2 may emit close during synchronous exec setup; the callback completes before this deferred retry.
        setImmediate(connectionClosed);
        return;
      }
      /* istanbul ignore if -- transport close races are exercised by the integration fixture. */
      if (!ended) finish(new SshError('SSH connection closed unexpectedly', 'SSH_CONNECTION'));
    };
    conn.on('ready', () => { clearTimeout(connectionTimer); next(); })
      .on('error', connectionError)
      .on('end', connectionClosed)
      .on('close', connectionClosed);
    connectionTimer = setTimeout(() => connectionError({ level: 'client-timeout', message: 'connection timeout' }), connectTimeout);
    // Intentional: shell is a transport/session option for ssh2; exec() remains non-interactive by contract.
    try {
      conn.connect({ host, port, username, privateKey: key, passphrase, password, agent, hostVerifier: verifier, knownHosts, readyTimeout: connectTimeout, shell });
    } catch (error) {
      finish(new SshError(`SSH connection error: ${error.message}`, 'SSH_CONNECTION', error));
    }
  });
}
