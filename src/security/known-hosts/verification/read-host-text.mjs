import { expandHomePath } from '../../../paths/expand-home-path.mjs';

export function readHostText({ knownHosts, knownHostsPath, fsLib, homedirFn }) {
  if (knownHosts !== undefined) return Promise.resolve(knownHosts);
  if (!knownHostsPath) return Promise.resolve('');
  return fsLib.readFile(expandHomePath(knownHostsPath, homedirFn), 'utf8');
}
