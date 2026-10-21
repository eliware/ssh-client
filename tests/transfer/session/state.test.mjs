import { expect, test } from "@jest/globals";
import { claimTransferSettlement } from "../../../src/transfer/session/state.mjs";

test("claims transfer settlement once", () => {
  const state = { settled: false };
  expect(claimTransferSettlement(state)).toBe(true);
  expect(claimTransferSettlement(state)).toBe(false);
});
