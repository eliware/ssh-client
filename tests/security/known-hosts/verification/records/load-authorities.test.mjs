import { expect, test } from '@jest/globals';
import { readAuthorities } from '../../../../../src/security/known-hosts/verification/records/load-authorities.mjs';

test('loads and validates host authority records', async () => {
  const utils = { parseKey: value => ({ getPublicSSH: () => Buffer.from(value) }) };
  const fsLib = { readFile: async () => '# comment\nssh-ed25519 authority\n' };
  await expect(readAuthorities('~/.ssh/ca', fsLib, () => 'C:/Users/test', utils)).resolves.toEqual(['ssh-ed25519 authority']);
});

test('rejects malformed authority records', async () => {
  const utils = { parseKey: () => ({}) };
  const fsLib = { readFile: async () => 'bad record' };
  await expect(readAuthorities('ca', fsLib, () => 'C:/Users/test', utils)).rejects.toThrow('invalid host CA');
});
