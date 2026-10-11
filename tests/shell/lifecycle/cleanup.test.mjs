import { expect, test, jest } from "@jest/globals";
import { clearShellControl } from "../../../src/shell/lifecycle/cleanup.mjs";

test("clears shell timers and abort listeners", () => {
  jest.useFakeTimers();
  const signal = new AbortController().signal;
  const abort = jest.fn();
  const timer = setTimeout(() => {}, 100);
  clearShellControl(timer, signal, abort);
  jest.advanceTimersByTime(100);
  expect(abort).not.toHaveBeenCalled();
  jest.useRealTimers();
});
