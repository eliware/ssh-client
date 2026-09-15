import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import ssh2 from '@eliware/ssh2';
import { SshError } from '../../../errors.mjs';
import { prepareSecurity } from '../../../connection/options/security.mjs';
import { validateOptions } from '../../options/validation.mjs';

const { Client } = ssh2;
export async function prepareExecution(options) {
  const { host, port = 22, username = process.env.USER || process.env.USERNAME, commands, ClientClass = Client, fsLib = fs, homedirFn = homedir, privateKey, privateKeyPath, passphrase, password, agent, hostVerifier, knownHosts, connectTimeout = 10000, commandTimeout: configuredCommandTimeout = 0, timeout, signal, maxOutput = 1000000, cwd, env, envFallback, pty = false, shell = false, keepAlive = false, knownHostsPath, hostCaPath } = options;
  const commandTimeout = timeout === undefined ? configuredCommandTimeout : timeout;
  validateOptions({ host, port, commands, maxOutput, cwd, connectTimeout, commandTimeout, env, envFallback, shell });
  let security;
  try { security = await prepareSecurity({ privateKey, privateKeyPath, passphrase, password, agent, hostVerifier, host, port, knownHosts, knownHostsPath, hostCaPath, fsLib, homedirFn, requireVerification: true, clientIsDefault: ClientClass === Client }); } catch (error) { throw new SshError(error.message, 'SSH_INVALID_OPTIONS', error); }
  if (signal?.aborted) throw new SshError('SSH operation cancelled', 'SSH_CANCELLED', undefined, { operation: 'exec', phase: 'options' });
  return { host, port, username, commands, ClientClass, ...security, knownHosts, connectTimeout, commandTimeout, signal, maxOutput, cwd, env, envFallback, pty, keepAlive };
}
