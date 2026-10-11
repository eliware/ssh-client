import { expect, jest, test } from "@jest/globals";
import { startConnectionLifecycleTimeout } from "../../../src/connection/lifecycle/timeout.mjs";

test("starts a lifecycle timeout", () => {
  jest.useFakeTimers();
  const callback = jest.fn();
  startConnectionLifecycleTimeout(10, callback);
  jest.advanceTimersByTime(10);
  expect(callback).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
