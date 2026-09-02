import { join } from 'node:path';
import { SshError } from './errors.mjs';
export async function loadKey({ privateKey, privateKeyPath, fsLib, homedirFn }) {
  if (privateKey) return privateKey;
  const paths = privateKeyPath ? [privateKeyPath] : [process.env.SSH_PRIVATE_KEY_PATH, join(homedirFn(), '.ssh', 'id_ed25519'), join(homedirFn(), '.ssh', 'id_rsa')].filter(Boolean);
  // codescope ignore: standard key probing fails closed without exposing local filesystem details.
  for (const path of paths) { try { return await fsLib.readFile(path, 'utf8'); } catch {} }
  throw new SshError('No private key found in ~/.ssh/; provide privateKey or privateKeyPath.', 'SSH_KEY_NOT_FOUND');
}
