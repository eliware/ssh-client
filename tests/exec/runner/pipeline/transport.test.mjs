import { expect, test } from '@jest/globals';
import { resolveClientClass } from '../../../../src/exec/runner/pipeline/transport.mjs';

test('returns an injected client class', () => {
  const ClientClass = class {};
  expect(resolveClientClass(ClientClass)).toBe(ClientClass);
});

test('returns the default SSH client when no class is supplied', () => {
  expect(resolveClientClass()).toBeDefined();
});
