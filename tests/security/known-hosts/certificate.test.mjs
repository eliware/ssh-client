import { expect, test } from '@jest/globals';
import { parseCertificate } from '../../../src/security/known-hosts/certificate.mjs';

test('ignores non-certificate host keys', () => {
  const field = value => Buffer.concat([Buffer.from([0, 0, 0, value.length]), value]);
  expect(parseCertificate(field(Buffer.from('ssh-ed25519')))).toBeNull();
});

test('rejects truncated certificate fields', () => {
  expect(() => parseCertificate(Buffer.alloc(2))).toThrow('truncated');
  const field = value => Buffer.concat([Buffer.from([0, 0, 0, value.length]), value]);
  expect(() => parseCertificate(field(Buffer.from('ssh-ed25519-cert-v01@openssh.com')))).toThrow('truncated');
});
