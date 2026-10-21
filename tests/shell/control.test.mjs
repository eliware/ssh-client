import { expect, jest, test } from "@jest/globals";
import { createShellControl } from "../../src/shell/control.mjs";

test.each([
  ["an aborted signal", 0, "SSH_CANCELLED", (controller) => controller.abort()],
  ["a timeout", 1, "SSH_TIMEOUT", () => jest.advanceTimersByTime(1)],
])("cancels shell setup for %s and cleans up once", (_cause, timeout, code, cancel) => {
  jest.useFakeTimers();
  try {
    const controller = new AbortController();
    const end = jest.fn();
    const onCancel = jest.fn();
    const control = createShellControl({ end }, controller.signal, timeout, onCancel);
    expect(control.start()).toBe(true);
    cancel(controller);
    expect(end).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ code }));
    control.cancel("SSH_TIMEOUT", "late timeout");
    expect(onCancel).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});

test("does not start after pre-abort and tolerates transport cleanup errors", () => {
  const controller = new AbortController();
  controller.abort();
  const onCancel = jest.fn();
  const control = createShellControl(
    {
      end: () => {
        throw Error("closed");
      },
    },
    controller.signal,
    0,
    onCancel,
  );
  expect(control.start()).toBe(false);
  expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ code: "SSH_CANCELLED" }));
  expect(control.isSettled()).toBe(true);
  control.settle();
});
