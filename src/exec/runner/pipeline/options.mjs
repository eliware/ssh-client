import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import ssh2 from '@eliware/ssh2';
import { SshError } from '../../../errors.mjs';
import { loadKey } from '../../../keys.mjs';
import { createHostVerifier } from '../../../security/known-hosts/verification/verifier.mjs';
import { adaptHostVerifier, validateOptions } from '../../options/validation.mjs';

const { Client, utils } = ssh2;
export async function prepareExecution(options) {
  const { host, port = 22, username = process.env.USER || process.env.USERNAME, commands, ClientClass = Client, fsLib = fs, homedirFn = homedir, privateKey, privateKeyPath, passphrase, password, agent, hostVerifier, knownHosts, connectTimeout = 10000, commandTimeout: configuredCommandTimeout = 0, timeout, signal, maxOutput = 1000000, cwd, env, envFallback, pty = false, shell = false, keepAlive = false, knownHostsPath, hostCaPath } = options;
  const commandTimeout = timeout === undefined ? configuredCommandTimeout : timeout;
  validateOptions({ host, port, commands, maxOutput, cwd, connectTimeout, commandTimeout, env, envFallback, shell });
  if (signal?.aborted) throw new SshError('SSH operation cancelled', 'SSH_CANCELLED', undefined, { operation: 'exec', phase: 'options' });
  if (hostVerifier !== undefined && typeof hostVerifier !== 'function') throw new SshError('hostVerifier must be a function', 'SSH_INVALID_OPTIONS');
  if (ClientClass === Client && !hostVerifier && !knownHosts && !knownHostsPath && !hostCaPath) throw new SshError('host verification configuration is required', 'SSH_INVALID_OPTIONS');
  const key = (privateKey !== undefined || privateKeyPath !== undefined || ((password === undefined || password === null) && !agent)) ? await loadKey({ privateKey, privateKeyPath, fsLib, homedirFn }) : undefined;
  const verifier = adaptHostVerifier(hostVerifier || createHostVerifier({ host, port, knownHosts, knownHostsPath, hostCaPath, fsLib, homedirFn, utils }));
  return { host, port, username, commands, ClientClass, key, passphrase, password, agent, verifier, knownHosts, connectTimeout, commandTimeout, signal, maxOutput, cwd, env, envFallback, pty, keepAlive };
}
