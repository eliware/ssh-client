import { expect, jest, test } from "@jest/globals";
import { createTransferControl } from "../../../src/transfer/session/control.mjs";

test("cancels an active transfer and closes its SFTP session once", async () => {
  const controller = new AbortController();
  const handle = { end: jest.fn() };
  const resolve = jest.fn();
  let reject;
  const rejected = new Promise((_resolve, rejectPromise) => {
    reject = rejectPromise;
  });
  const control = createTransferControl({
    signal: controller.signal,
    timeout: 0,
    operation: "upload",
    resolve,
    reject,
  });
  control.setSftp(handle);
  const rejection = expect(rejected).rejects.toMatchObject({ code: "SSH_CANCELLED" });
  controller.abort();
  await rejection;
  control.finish();
  expect(control.isSettled()).toBe(true);
  expect(handle.end).toHaveBeenCalledTimes(1);
  expect(resolve).not.toHaveBeenCalled();
});

test("times out an active transfer and closes its SFTP session", async () => {
  jest.useFakeTimers();
  try {
    const handle = { end: jest.fn() };
    const rejected = new Promise((_resolve, reject) => {
      const control = createTransferControl({
        timeout: 5,
        operation: "download",
        resolve: jest.fn(),
        reject,
      });
      control.setSftp(handle);
    });
    const rejection = expect(rejected).rejects.toMatchObject({ code: "SSH_TIMEOUT" });
    await jest.advanceTimersByTimeAsync(5);
    await rejection;
    expect(handle.end).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});

test("rejects an already aborted transfer without starting a timeout", async () => {
  const controller = new AbortController();
  controller.abort();
  const rejected = new Promise((_resolve, reject) => {
    createTransferControl({
      signal: controller.signal,
      timeout: 5,
      operation: "upload",
      resolve: jest.fn(),
      reject,
    });
  });
  await expect(rejected).rejects.toMatchObject({ code: "SSH_CANCELLED" });
});
