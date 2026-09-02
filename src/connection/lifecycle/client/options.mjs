import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import ssh2 from '@eliware/ssh2';
import { loadKey } from '../../../keys.mjs';
import { createHostVerifier } from '../../../security/known-hosts/verification/verifier.mjs';
import { validateConnectionOptions } from '../../validation.mjs';

const { Client, utils } = ssh2;
export async function prepareConnection(options = {}) {
  const { host, port = 22, username = process.env.USER || process.env.USERNAME, privateKey, privateKeyPath, passphrase, password, agent, knownHosts, knownHostsPath, hostCaPath, connectTimeout = 10000, ClientClass = Client, fsLib = fs, homedirFn = homedir } = options;
  validateConnectionOptions({ ...options, host, port, connectTimeout, ClientClass }, Client, connectTimeout);
  const key = privateKey !== undefined || privateKeyPath !== undefined || ((password === undefined || password === null) && !agent) ? await loadKey({ privateKey, privateKeyPath, fsLib, homedirFn }) : undefined;
  const hostVerifier = options.hostVerifier || createHostVerifier({ host, port, knownHosts, knownHostsPath, hostCaPath, fsLib, homedirFn, utils });
  return { options, ClientClass, connectTimeout, clientConfig: { host, port, username, privateKey: key, passphrase, password, agent, hostVerifier, knownHosts, readyTimeout: connectTimeout, authTimeout: connectTimeout } };
}
