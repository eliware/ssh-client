import { expect, test } from '@jest/globals';
import { claimSettlement } from '../../../../src/exec/runner/pipeline/settlement.mjs';

test('claims an unsettled operation once', () => {
  const state = { value: false };
  expect(claimSettlement(state)).toBe(true);
  expect(state.value).toBe(true);
});

test('rejects a second settlement claim', () => {
  const state = { value: true };
  expect(claimSettlement(state)).toBe(false);
});
