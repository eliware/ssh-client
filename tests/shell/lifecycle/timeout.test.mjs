import { expect, jest, test } from "@jest/globals";
import { startShellTimeout } from "../../../src/shell/lifecycle/timeout.mjs";

test("starts only positive shell timers", () => {
  expect(startShellTimeout(0, () => {})).toBeUndefined();
  jest.useFakeTimers();
  const callback = jest.fn();
  startShellTimeout(1, callback);
  jest.advanceTimersByTime(1);
  expect(callback).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});
