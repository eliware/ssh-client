import { expect, jest, test } from "@jest/globals";
import { createCommandCallback } from "../../../../../src/exec/runner/pipeline/command/callback.mjs";

function makeContext(overrides = {}) {
  return {
    commandTimeout: 0,
    keepAlive: false,
    conn: { end: jest.fn() },
    isSettled: () => false,
    setActiveTimer: jest.fn(),
    setCommandStarting: jest.fn(),
    clearActiveTimer: jest.fn(),
    finish: jest.fn(),
    ...overrides,
  };
}

test("closes a late command stream after the operation settles", () => {
  const context = makeContext({ isSettled: () => true });
  const close = jest.fn();
  const callback = createCommandCallback({ context, command: "run", output: {}, started: 0 });
  callback.done(null, { close });
  expect(close).toHaveBeenCalledTimes(1);
  expect(context.setCommandStarting).toHaveBeenCalledWith(false);
});

test("reports callback and invocation errors", () => {
  const callbackErrorContext = makeContext();
  const callbackError = createCommandCallback({
    context: callbackErrorContext,
    command: "run",
    output: {},
    started: 0,
  });
  callbackError.done(Error("callback"));
  expect(callbackErrorContext.finish).toHaveBeenCalledWith(
    expect.objectContaining({ code: "SSH_EXEC" }),
  );

  const invocationErrorContext = makeContext();
  const invocationError = createCommandCallback({
    context: invocationErrorContext,
    command: "run",
    output: {},
    started: 0,
  });
  invocationError.fail(Error("invoke"));
  invocationError.finishInvocation();
  expect(invocationErrorContext.finish).toHaveBeenCalledWith(
    expect.objectContaining({ message: "SSH exec error: invoke", code: "SSH_EXEC" }),
  );
});

test("closes late streams after a command timeout", () => {
  jest.useFakeTimers();
  try {
    const context = makeContext({ commandTimeout: 5 });
    const callback = createCommandCallback({ context, command: "run", output: {}, started: 0 });
    jest.advanceTimersByTime(5);
    const close = jest.fn();
    callback.done(null, { close });
    expect(context.finish).toHaveBeenCalledWith(
      expect.objectContaining({ code: "SSH_COMMAND_TIMEOUT" }),
    );
    expect(close).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});
