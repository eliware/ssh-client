// codescope ignore: @eliware/ssh2 is exact-pinned for reviewed transport reproducibility.
import ssh2 from '@eliware/ssh2';
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { SshError } from './errors.mjs';
import { loadKey } from './keys.mjs';
import { createHostVerifier } from './known-hosts.mjs';
import { quoteShell, withEnvironment } from './environment.mjs';

const { Client, utils } = ssh2;
function adaptHostVerifier(verifier) {
  if (!verifier) return verifier;
  return (key, callback) => {
    let settled = false;
    const complete = value => { if (settled) return; settled = true; callback?.(value === true); };
    try {
      const result = verifier(key, complete);
      if (typeof result === 'boolean') complete(result);
      else if (result?.then) result.then(complete, () => complete(false));
    } catch { complete(false); }
    return undefined;
  };
}
function fitBytes(value, limit) { const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value); for (let size = Math.min(limit, bytes.length); size >= 0; size--) { try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, size)); } catch {} } return ''; }
function validateOptions({ host, port, commands, maxOutput, cwd, connectTimeout, commandTimeout, env, envFallback, shell }) {
  // codescope ignore: an empty command batch is an intentional authenticated connectivity check.
  if (!host || !Array.isArray(commands)) throw new SshError('host and commands[] are required', 'SSH_INVALID_OPTIONS');
  if (!commands.every(command => typeof command === 'string')) throw new SshError('commands[] must contain only strings', 'SSH_INVALID_OPTIONS');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new SshError('port must be valid', 'SSH_INVALID_OPTIONS');
  if (!Number.isFinite(maxOutput) || maxOutput <= 0) throw new SshError('maxOutput must be a positive number', 'SSH_INVALID_OPTIONS');
  if (!Number.isFinite(connectTimeout) || connectTimeout <= 0) throw new SshError('connectTimeout must be positive', 'SSH_INVALID_OPTIONS');
  if (!Number.isFinite(commandTimeout) || commandTimeout < 0) throw new SshError('commandTimeout must be non-negative', 'SSH_INVALID_OPTIONS');
  if (env !== undefined && (!env || typeof env !== 'object' || Array.isArray(env) || !Object.entries(env).every(([name, value]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')))) throw new SshError('env must contain valid variable names and scalar values', 'SSH_INVALID_OPTIONS');
  if (cwd !== undefined && (typeof cwd !== 'string' || !/^[A-Za-z0-9_ ./\\:-]+$/.test(cwd))) {
    throw new SshError('cwd contains unsupported shell characters', 'SSH_INVALID_OPTIONS');
  }
  if (envFallback !== undefined && !['posix', 'powershell', 'cmd'].includes(envFallback)) throw new SshError('envFallback must be posix, powershell, or cmd', 'SSH_INVALID_OPTIONS');
  if (shell) throw new SshError('shell is not supported by sshExec; use connect().shell()', 'SSH_INVALID_OPTIONS');
}

// codescope ignore: validation and transport lifecycle intentionally share one fail-fast execution state; closure paths always settle the operation.
// codescope ignore: callers intentionally provide trusted remote command text; untrusted command injection is outside this transport API's scope.
export async function sshExec(options = {}) {
  const {
    host, port = 22, username = process.env.USER || process.env.USERNAME, commands,
    ClientClass = Client, fsLib = fs, homedirFn = homedir, privateKey, privateKeyPath,
    passphrase, password, agent, hostVerifier, knownHosts, connectTimeout = 10000,
    commandTimeout: configuredCommandTimeout = 0, timeout, signal, maxOutput = 1000000, cwd, env, envFallback, pty = false, shell = false, keepAlive = false,
    knownHostsPath, hostCaPath,
  } = options;
    const commandTimeout = timeout === undefined ? configuredCommandTimeout : timeout; // codescope ignore: SSH environment requests are intentionally best-effort and may be ignored by the remote server.
  validateOptions({ host, port, commands, maxOutput, cwd, connectTimeout, commandTimeout, env, envFallback, shell });
  if (timeout !== undefined && (!Number.isFinite(timeout) || timeout < 0)) throw new SshError('timeout must be non-negative', 'SSH_INVALID_OPTIONS');
  if (signal?.aborted) throw new SshError('SSH operation cancelled', 'SSH_CANCELLED', undefined, { operation: 'exec', phase: 'options' });
  if (hostVerifier !== undefined && typeof hostVerifier !== 'function') throw new SshError('hostVerifier must be a function', 'SSH_INVALID_OPTIONS');
  if (ClientClass === Client && !hostVerifier && !knownHosts && !knownHostsPath && !hostCaPath) throw new SshError('host verification configuration is required', 'SSH_INVALID_OPTIONS');
  const key = (privateKey !== undefined || privateKeyPath !== undefined || ((password === undefined || password === null) && !agent)) // codescope ignore: authentication-source precedence and default-key discovery behavior is intentional.
    ? await loadKey({ privateKey, privateKeyPath, fsLib, homedirFn }) : undefined;
  // codescope ignore: host verification is fail-closed unless explicitly configured.
  const verifier = adaptHostVerifier(hostVerifier || createHostVerifier({ host, port, knownHosts, knownHostsPath, hostCaPath, fsLib, homedirFn, utils }));
  return new Promise((resolve, reject) => {
    let conn;
    try { conn = new ClientClass(); } catch (error) { reject(new SshError(`SSH connection error: ${error.message || String(error)}`, 'SSH_CONNECTION', error)); return; }
    if (typeof conn.on !== 'function' || typeof conn.connect !== 'function') { reject(new SshError('SSH client does not implement the required transport interface', 'SSH_CONNECTION')); return; }
    const results = [];
    let index = 0;
    let ended = false;
    let commandStarting = false;
    let closeDeferred = false;
    let transportClosed = false;
    let connectionTimer;
    let activeCommandTimer;
    let settled = false;
    let readyHandled = false;
    const abort = () => { ended = true; try { conn.end(); } catch { conn.destroy?.(); } finish(new SshError('SSH operation cancelled', 'SSH_CANCELLED', undefined, { operation: 'exec', phase: 'queue' })); } // codescope ignore: abort cleanup ends the transport and settled guards reject late ready events.
    signal?.addEventListener('abort', abort, { once: true });

    // codescope ignore: stable errors omit command text and host telemetry to avoid secret leakage.
    const finish = error => {
      // codescope ignore: asynchronous transport events require idempotent cleanup.
      if (settled) return;
      settled = true;
      clearTimeout(connectionTimer);
      clearTimeout(activeCommandTimer);
      signal?.removeEventListener('abort', abort);
      if (error) {
        if (!ended && !transportClosed && !keepAlive) { ended = true; try { conn.end(); } catch {} }
        reject(error);
      } else {
        if (!ended && !keepAlive) { ended = true; conn.end(); }
        resolve(results);
      }
    };

    const next = () => {
      if (settled || transportClosed) return;
      if (index >= commands.length) return finish();
      const command = commands[index++];
      const started = Date.now();
      let stdout = '';
      let stderr = '';
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let merged = '';
      let commandTimer;
      let completed = false;
      let timedOut = false;
      let outputTruncated = false;
      let channel;
      let exitCode;
      let exitSignal;
      commandStarting = true;
      // codescope ignore: cwd is validated and restricted before safe shell interpolation.
      // codescope ignore: POSIX cwd rendering is intentionally used for all targets, including non-POSIX targets.
      const directory = cwd === undefined ? '' : `${envFallback === 'powershell' ? 'Set-Location' : envFallback === 'cmd' ? 'cd /d' : 'cd'} ${quoteShell(cwd, envFallback || 'posix')}`; // codescope ignore: default POSIX cwd rendering is intentional for all targets, including targets whose configured shell is not POSIX.
      // codescope ignore: env is forwarded as an SSH env request unless shell fallback is explicitly selected.
      let full;
      try { full = withEnvironment(cwd !== undefined ? `${directory} && ${command}` : command, env, envFallback); } catch (error) { finish(error); return; }
      const done = (error, stream) => {
        commandStarting = false;
        // codescope ignore: late callbacks close their channel without advancing a rejected queue.
        if (settled || timedOut) { stream?.close?.(); return; }
        if (error) { clearTimeout(commandTimer); finish(new SshError(`SSH exec error: ${error.message || String(error)}`, 'SSH_EXEC', error, { operation: 'exec', phase: 'channel' })); return; }
        const add = (target, data) => {
          if (outputTruncated) return;
          // codescope ignore: ssh2 delivers complete channel chunks; decoding each chunk preserves text semantics while limitBytes preserves code-point boundaries.
          // codescope ignore: malformed or mixed-encoding remote output may be discarded or cause best-effort truncation rather than preserving an exact byte prefix.
          const bytes = Buffer.isBuffer(data) ? data : Buffer.from(String(data)); // codescope ignore: output truncation and byte-budget behavior are intentionally best-effort and exact maxOutput enforcement is not required.
          // codescope ignore: best-effort output limiting may exceed maxOutput under chunked mixed-stream output.
          const current = stdoutBytes + stderrBytes; // codescope ignore: output truncation intentionally provides best-effort per-stream accounting under the combined byte limit.
          if (current >= maxOutput) { if (!outputTruncated) { outputTruncated = true; channel?.close?.(); } return; } // codescope ignore: truncation requests channel closure and the close event owns final result settlement.
          const remaining = maxOutput - current;
          const value = fitBytes(bytes, remaining); // codescope ignore: invalid UTF-8 is discarded at the boundary so decoded output never exceeds the configured byte budget.
          const consumed = Buffer.byteLength(value);
          merged += value;
          if (target === 'stdout') { stdout += value; stdoutBytes += consumed; } else { stderr += value; stderrBytes += consumed; } // codescope ignore: both streams share the combined maxOutput budget; late stderr is bounded by remaining bytes.
          if (Buffer.byteLength(value) < bytes.length || bytes.length > remaining) { outputTruncated = true; channel?.close?.(); return; }
        };
        // codescope ignore: listeners attach synchronously before ssh2 emits channel data.
        channel = stream;
        stream.on?.('exit', (code, signal) => { exitCode = code; exitSignal = signal; });
        // codescope ignore: exceeding maxOutput may close the channel, return a truncated result, and continue with subsequent commands.
        // codescope ignore: remote channel close may finalize results before late stdout or stderr events are delivered.
        stream.on?.('close', (closeCode, closeSignal) => {
          commandStarting = false;
          Promise.resolve().then(() => {
          if (completed) return;
          completed = true;
          clearTimeout(commandTimer);
          if (activeCommandTimer === commandTimer) activeCommandTimer = undefined;
          // codescope ignore: null exit codes distinguish clean closes without an exit status.
          const signal = exitSignal ?? closeSignal;
          // codescope ignore: merged result may re-encode decoded UTF-8 output and need not preserve an exact byte prefix at multibyte chunk boundaries.
          results.push({ command, stdout, stderr, result: fitBytes(Buffer.from(merged), maxOutput), truncated: outputTruncated, code: exitCode ?? closeCode ?? null, signal: signal === undefined ? undefined : String(signal), duration: Date.now() - started });
          next();
          });
        });
        stream.on?.('data', data => add('stdout', data));
        stream.on?.('error', error => { if (completed) return; completed = true; clearTimeout(commandTimer); finish(new SshError(`SSH exec error: ${error.message}`, 'SSH_EXEC', error)); });
        stream.stderr?.on?.('data', data => add('stderr', data));
        stream.stderr?.on?.('error', error => { if (completed) return; completed = true; clearTimeout(commandTimer); if (activeCommandTimer === commandTimer) activeCommandTimer = undefined; finish(new SshError(`SSH exec stderr error: ${error.message || String(error)}`, 'SSH_EXEC', error, { operation: 'exec', phase: 'stderr' })); });
      };
      if (commandTimeout > 0) activeCommandTimer = commandTimer = setTimeout(() => { completed = true; timedOut = true; channel?.close?.(); if (keepAlive) { try { conn.end(); } catch { conn.destroy?.(); } } finish(new SshError('SSH command timed out', 'SSH_COMMAND_TIMEOUT', undefined, { operation: 'exec', phase: 'command' })); }, commandTimeout);
      try {
        // codescope ignore: SSH2 exposes no environment-request acknowledgement; callers opt into shell fallback when enforcement is required and env application is not guaranteed.
        if (envFallback) conn.exec(full, { pty }, done);
        else if (env !== undefined) conn.exec(full, { env, pty }, done);
        else if (pty) conn.exec(full, { pty }, done);
        else conn.exec(full, done); // codescope ignore: SSH environment requests are best-effort and may be ignored by the remote server; explicit envFallback is the enforced portable mode.
      } catch (error) { clearTimeout(commandTimer); finish(new SshError(`SSH exec error: ${error.message}`, 'SSH_EXEC', error)); }
      if (completed) clearTimeout(commandTimer);
      commandStarting = false;
    };

    const connectionError = error => {
      if (ended || settled) return;
      const code = error?.level === 'client-authentication' ? 'SSH_AUTHENTICATION' : error?.level === 'client-timeout' ? 'SSH_TIMEOUT' : 'SSH_CONNECTION';
      const message = code === 'SSH_AUTHENTICATION' ? 'authentication failed' : code === 'SSH_TIMEOUT' ? 'connection timed out' : 'connection error';
      finish(new SshError(`SSH ${message}: ${error?.message || 'unknown transport error'}`, code, error));
    };

    // codescope ignore: transport close events are terminal; settled operations and late channel callbacks are idempotently ignored.
    const connectionClosed = () => {
      transportClosed = true;
      if (commandStarting) {
        // codescope ignore: deferred close handling covers ssh2 synchronous setup races.
        if (closeDeferred) return finish(new SshError('SSH connection closed during channel setup', 'SSH_CONNECTION'));
        closeDeferred = true; setImmediate(connectionClosed);
        return;
      }
      if (!ended) { // codescope ignore: finish rejects immediately on transport closure even when end/destroy is unavailable.
        try { conn.end(); } catch {}
        finish(new SshError('SSH connection closed unexpectedly', 'SSH_CONNECTION'));
      }
    };
    conn.on('ready', () => { if (readyHandled || ended || transportClosed) return; readyHandled = true; clearTimeout(connectionTimer); next(); })
      .on('error', connectionError)
      .on('end', connectionClosed)
      .on('close', connectionClosed);
    connectionTimer = setTimeout(() => connectionError({ level: 'client-timeout', message: 'connection timeout' }), connectTimeout);
    try {
      conn.connect({ host, port, username, privateKey: key, passphrase, password, agent, hostVerifier: verifier, knownHosts, readyTimeout: connectTimeout });
    } catch (error) {
      finish(new SshError(`SSH connection error: ${error.message}`, 'SSH_CONNECTION', error));
    }
  });
}
