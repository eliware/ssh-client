import { expect, test } from '@jest/globals';
import { readPrincipals } from '../../../../src/security/known-hosts/certificates/principals.mjs';

test('reads certificate principals', () => { const field = value => Buffer.concat([Buffer.from([0, 0, 0, value.length]), value]); expect(readPrincipals(Buffer.concat([field(Buffer.from('router')), field(Buffer.from('db'))]))).toEqual(['router', 'db']); });
