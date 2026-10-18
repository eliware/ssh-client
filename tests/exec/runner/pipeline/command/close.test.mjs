import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { handleCommandClose } from "../../../../../src/exec/runner/pipeline/command/close.mjs";

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-17T12:00:00.000Z"));
});
afterEach(() => jest.useRealTimers());

test("assembles command result and advances queue", async () => {
  const context = {
    setCommandStarting: jest.fn(),
    clearActiveTimer: jest.fn(),
    results: [],
    maxOutput: 100,
  };
  const next = jest.fn();
  const state = { exitCode: 0, exitSignal: undefined };
  handleCommandClose({
    context,
    output: { stdout: "out", stderr: "err", merged: "outerr", truncated: false },
    command: "echo",
    started: Date.now(),
    getState: () => state,
    closeCode: 0,
    closeSignal: undefined,
    commandTimer: undefined,
    isCompleted: () => false,
    markCompleted: jest.fn(),
    next,
  });
  await jest.runAllTimersAsync();
  expect(context.results[0]).toMatchObject({ command: "echo", stdout: "out", code: 0 });
  expect(next).toHaveBeenCalled();
});
