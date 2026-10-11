import { expect, jest, test } from "@jest/globals";
import { createShellControl } from "../../src/shell/control.mjs";

test("cancels shell setup on an aborted signal and cleans up once", () => {
  const controller = new AbortController();
  const end = jest.fn();
  const onCancel = jest.fn();
  const control = createShellControl({ end }, controller.signal, 0, onCancel);
  expect(control.start()).toBe(true);
  controller.abort();
  expect(end).toHaveBeenCalledTimes(1);
  expect(onCancel).toHaveBeenCalledWith(expect.objectContaining({ code: "SSH_CANCELLED" }));
  control.cancel("SSH_TIMEOUT", "late timeout");
  expect(onCancel).toHaveBeenCalledTimes(1);
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
