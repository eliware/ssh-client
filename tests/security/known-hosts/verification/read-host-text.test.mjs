import { expect, test } from '@jest/globals';
import { readHostText } from '../../../../src/security/known-hosts/verification/read-host-text.mjs';

test('prefers inline known-host text and supports file text', async () => {
  const fsLib = { readFile: async path => `${path}:loaded` }; const homedirFn = () => 'C:/Users/test';
  await expect(readHostText({ knownHosts: 'inline', knownHostsPath: 'ignored', fsLib })).resolves.toBe('inline');
  await expect(readHostText({ knownHostsPath: 'hosts', fsLib, homedirFn })).resolves.toBe('hosts:loaded');
  await expect(readHostText({ fsLib, homedirFn })).resolves.toBe('');
});
