import { expect, test } from '@jest/globals';
import { verifyCertificate } from '../../../../src/security/known-hosts/verification/certificate-verification.mjs';

test('rejects certificates without a usable CA or matching validity', () => {
  const cert = { signingKey: Buffer.from('ca'), kind: 2, after: 0n, before: 99n, principals: ['router'], base: 'ssh-ed25519', signature: Buffer.alloc(0), signed: Buffer.from('signed') };
  expect(verifyCertificate(cert, 'ca', { parseKey: () => null }, ['router'], 10n)).toBe(false);
  const ca = { getPublicSSH: () => Buffer.from('other'), verify: () => true };
  expect(verifyCertificate(cert, 'ca', { parseKey: () => ca }, ['router'], 10n)).toBe(false);
});

test('rejects expired, unauthorized, and malformed certificate signatures', () => {
  const cert = { signingKey: Buffer.from('ca'), kind: 2, after: 20n, before: 99n, principals: ['router'], base: 'ssh-ed25519', signature: Buffer.alloc(0), signed: Buffer.from('signed') };
  const ca = { getPublicSSH: () => Buffer.from('ca'), verify: () => true };
  const utils = { parseKey: () => ca };
  expect(verifyCertificate(cert, 'ca', utils, ['router'], 10n)).toBe(false);
  cert.after = 0n; cert.principals = ['other'];
  expect(verifyCertificate(cert, 'ca', utils, ['router'], 10n)).toBe(false);
});
