import { expect, test } from '@jest/globals';
import { evaluateRecords } from '../../../../../src/security/known-hosts/verification/records/evaluate.mjs';

test('evaluates trusted, revoked, and certificate-authority records', () => {
  const publicKey = { equals: () => true };
  const utils = { parseKey: () => ({ getPublicSSH: () => publicKey }) };
  expect(evaluateRecords('router.example ssh-ed25519 key', ['router.example'], { getPublicSSH: () => publicKey }, null, utils)).toMatchObject({ accepted: true, invalid: false });
  expect(evaluateRecords('@revoked router.example ssh-ed25519 key', ['router.example'], { getPublicSSH: () => publicKey }, null, utils)).toMatchObject({ revoked: ['ssh-ed25519 key'], invalid: false });
  expect(evaluateRecords('@cert-authority router.example ssh-ed25519 key', ['router.example'], { getPublicSSH: () => publicKey }, {}, utils)).toMatchObject({ authorities: ['ssh-ed25519 key'], invalid: false });
});

test('rejects malformed record markers and fields', () => {
  const utils = { parseKey: () => ({ getPublicSSH: () => ({ equals: () => false }) }) };
  expect(evaluateRecords('@unknown router key value', ['router'], {}, null, utils)).toMatchObject({ invalid: true });
  expect(evaluateRecords('router key', ['router'], {}, null, utils)).toMatchObject({ invalid: true });
});
