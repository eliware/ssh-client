import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import ssh2 from '@eliware/ssh2';
import { loadKey } from '../../keys/load-key.mjs';
import { createHostVerifier } from '../../security/known-hosts/verification/verifier.mjs';
import { adaptHostVerifier } from '../../exec/options/adapt-host-verifier.mjs';

const { utils } = ssh2;

export async function prepareSecurity({ privateKey, privateKeyPath, passphrase, password, agent, hostVerifier, host, port, knownHosts, knownHostsPath, hostCaPath, fsLib = fs, homedirFn = homedir, requireVerification = false, clientIsDefault = false }) {
  if (hostVerifier !== undefined && typeof hostVerifier !== 'function') throw new Error('hostVerifier must be a function');
  if (clientIsDefault && requireVerification && !hostVerifier && !knownHosts && !knownHostsPath && !hostCaPath) throw new Error('host verification configuration is required');
  const key = privateKey !== undefined || privateKeyPath !== undefined || ((password === undefined || password === null) && !agent) ? await loadKey({ privateKey, privateKeyPath, fsLib, homedirFn }) : undefined;
  const verifier = adaptHostVerifier(hostVerifier || createHostVerifier({ host, port, knownHosts, knownHostsPath, hostCaPath, fsLib, homedirFn, utils }));
  return { key, passphrase, password, agent, verifier, hostVerifier: verifier };
}
