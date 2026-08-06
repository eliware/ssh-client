import { Client } from 'ssh2';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export class SshError extends Error {
  constructor(message, code, cause) { super(message, { cause }); this.name = 'SshError'; this.code = code; }
}

async function loadKey({ privateKey, privateKeyPath, fsLib, homedirFn }) {
  if (privateKey) return privateKey;
  const paths = privateKeyPath ? [privateKeyPath] : [process.env.SSH_PRIVATE_KEY_PATH, join(homedirFn(), '.ssh', 'id_ed25519'), join(homedirFn(), '.ssh', 'id_rsa')].filter(Boolean);
  for (const path of paths) { try { return await fsLib.readFile(path, 'utf8'); } catch {} }
  throw new SshError('No private key found in ~/.ssh/; provide privateKey or privateKeyPath.', 'SSH_KEY_NOT_FOUND');
}

/** Execute commands sequentially over a verified, reusable SSH connection. */
export async function sshExec({
  host, port = 22, username = process.env.USER || process.env.USERNAME, commands,
  ClientClass = Client, fsLib = fs, homedirFn = homedir, privateKey, privateKeyPath,
  passphrase, agent, hostVerifier, knownHosts, connectTimeout = 10_000, commandTimeout = 0,
  maxOutput = 1_000_000, cwd, env, pty = false, shell = false,
} = {}) {
  if (!host || !Array.isArray(commands)) throw new SshError('host and commands[] are required', 'SSH_INVALID_OPTIONS');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new SshError('port must be valid', 'SSH_INVALID_OPTIONS');
  const key = await loadKey({ privateKey, privateKeyPath, fsLib, homedirFn });
  return await new Promise((resolve, reject) => {
    const conn = new ClientClass(); const results = []; let i = 0; let ended = false; let connectTimer;
    const finish = (error) => { clearTimeout(connectTimer); if (error) { /* istanbul ignore else -- errors terminate before normal completion */ if (!ended) conn.end(); reject(error); } else { ended = true; conn.end(); resolve(results); } };
    const runNext = () => {
      if (i >= commands.length) return finish();
      const command = commands[i++]; let stdout = ''; let stderr = ''; let timer;
      const fullCommand = cwd ? `cd ${JSON.stringify(cwd)} && ${command}` : command;
      const onExec = (err, stream) => {
        if (err) return finish(new SshError(`SSH exec error: ${err.message}`, 'SSH_EXEC', err));
        if (commandTimeout > 0) timer = setTimeout(() => { stream.close?.(); finish(new SshError(`SSH command timed out: ${command}`, 'SSH_COMMAND_TIMEOUT')); }, commandTimeout);
        const append = (target, data) => { const text = String(data); if ((stdout.length + stderr.length) < maxOutput) { const room = maxOutput - stdout.length - stderr.length; return target === 'stdout' ? stdout += text.slice(0, room) : stderr += text.slice(0, room); } return target; };
        stream.on('close', (code, signal) => { clearTimeout(timer); results.push({ command, stdout, stderr, result: stdout + stderr, code, signal, duration: undefined }); runNext(); }).on('data', data => append('stdout', data));
        stream.stderr.on('data', data => append('stderr', data));
      };
      if (env || pty) conn.exec(fullCommand, { env, pty }, onExec); else conn.exec(fullCommand, onExec);
    };
    const handler = (err) => { if (ended) return; const code = err.level === 'client-authentication' ? 'SSH_AUTHENTICATION' : err.level === 'client-timeout' ? 'SSH_TIMEOUT' : 'SSH_CONNECTION'; finish(new SshError(`SSH ${code === 'SSH_AUTHENTICATION' ? 'authentication failed' : code === 'SSH_TIMEOUT' ? 'connection timed out' : 'connection error'}: ${err.message}`, code, err)); };
    conn.on('ready', runNext).on('error', handler).on('end', () => { ended = true; }).on('close', () => { ended = true; });
    connectTimer = setTimeout(() => handler({ level: 'client-timeout', message: 'connection timeout' }), connectTimeout);
    conn.connect({ host, port, username, privateKey: key, passphrase, agent, hostVerifier, knownHosts, readyTimeout: connectTimeout, shell });
  });
}
