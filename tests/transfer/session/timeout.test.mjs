import { expect, test } from "@jest/globals";
import { startTransferTimeout } from "../../../src/transfer/session/timeout.mjs";

test("starts timers only for positive timeouts", () => {
  expect(startTransferTimeout(0, () => {})).toBeUndefined();
  const timer = startTransferTimeout(1000, () => {});
  expect(timer).toBeDefined();
  clearTimeout(timer);
});
