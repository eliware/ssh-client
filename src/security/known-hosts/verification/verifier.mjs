import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { expandPath } from '../../../paths.mjs';
import { parseCertificate } from '../certificate.mjs';
import { verifyCertificate } from './certificate-verification.mjs';
import { readAuthorities } from './records.mjs';
import { sameKey } from './keys.mjs';
import { finishVerification } from './callback.mjs';
import { evaluateRecords } from './records.mjs';

export function dateValid(value, now = new Date()) { if (!value) return false; const date = Date.parse(value); return Number.isFinite(date) && date <= now.getTime(); }

export function createHostVerifier({ host, port = 22, knownHosts, knownHostsPath, hostCaPath, fsLib = fs, homedirFn = homedir, utils } = {}) {
  if (!host || (!knownHosts && !knownHostsPath && !hostCaPath) || typeof utils?.parseKey !== 'function') return () => false;
  const hosts = [host, `[${host}]:${port}`];
  return (key, callback) => {
    const verification = (async () => { let accepted = false; try {
      const text = knownHosts ?? (knownHostsPath ? await fsLib.readFile(expandPath(knownHostsPath, homedirFn), 'utf8') : '');
      const raw = Buffer.from(key); let cert; try { cert = parseCertificate(raw); } catch { cert = null; }
      const actual = cert ? { getPublicSSH: () => cert.hostKey } : utils.parseKey(key); const records = evaluateRecords(text, hosts, actual, cert, utils); if (records.invalid || records.revoked.some(record => sameKey(record, actual, utils))) return false; accepted = records.accepted;
      const fileAuthorities = hostCaPath ? await readAuthorities(hostCaPath, fsLib, homedirFn, utils) : [];
      if (!accepted && cert) accepted = [...records.authorities, ...fileAuthorities].some(ca => verifyCertificate(cert, ca, utils, hosts));
    } catch {} return accepted; })();
    return finishVerification(verification, callback);
  };
}
