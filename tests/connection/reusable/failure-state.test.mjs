import { expect, test } from '@jest/globals';
import { closeOnTransportFailure } from '../../../src/connection/reusable/failure-state.mjs';

test('closes state for transport failure codes', () => {
  const state = { set: value => { state.value = value; } };
  const error = { code: 'SSH_TIMEOUT' };
  expect(closeOnTransportFailure(state, error)).toBe(error);
  expect(state.value).toBe('closed');
});

test('preserves state for unrelated errors', () => {
  const state = { set: () => { throw Error('unexpected'); } };
  expect(closeOnTransportFailure(state, { code: 'SSH_EXEC' })).toEqual({ code: 'SSH_EXEC' });
});
