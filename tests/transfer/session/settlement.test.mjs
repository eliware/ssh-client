import { expect, test, jest } from "@jest/globals";
import { normalizeTransferError } from "../../../src/transfer/session/errors.mjs";
import { settleTransfer } from "../../../src/transfer/session/settlement.mjs";

test("settles success and rejects cleanup failures", () => {
  const state = { settled: false };
  const resolve = jest.fn();
  const reject = jest.fn();
  const cleanup = jest.fn();
  settleTransfer({
    state,
    cleanup,
    sftp: {},
    operation: "upload",
    result: "ok",
    closeSftp: () => undefined,
    normalizeTransferError,
    resolve,
    reject,
  });
  expect(resolve).toHaveBeenCalledWith("ok");
  expect(cleanup).toHaveBeenCalled();
  const second = { settled: false };
  settleTransfer({
    state: second,
    cleanup,
    sftp: {},
    operation: "upload",
    closeSftp: () => Error("close"),
    normalizeTransferError,
    resolve,
    reject,
  });
  expect(reject).toHaveBeenCalled();
});

test("does not settle or clean up an already settled transfer", () => {
  const cleanup = jest.fn();
  const resolve = jest.fn();
  const reject = jest.fn();
  const result = settleTransfer({
    state: { settled: true },
    cleanup,
    closeSftp: jest.fn(),
    normalizeTransferError,
    resolve,
    reject,
  });
  expect(result).toBe(false);
  expect(cleanup).not.toHaveBeenCalled();
  expect(resolve).not.toHaveBeenCalled();
  expect(reject).not.toHaveBeenCalled();
});

test("rejects when asynchronous SFTP cleanup fails", async () => {
  const resolve = jest.fn();
  const reject = jest.fn();
  const closeError = Error("async close");
  settleTransfer({
    state: { settled: false },
    cleanup: jest.fn(),
    sftp: {},
    operation: "upload",
    result: "ok",
    closeSftp: () => Promise.reject(closeError),
    normalizeTransferError,
    resolve,
    reject,
  });
  await Promise.resolve();
  expect(resolve).not.toHaveBeenCalled();
  expect(reject).toHaveBeenCalledWith(
    expect.objectContaining({
      code: "SSH_SFTP",
      context: { operation: "upload", phase: "cleanup" },
    }),
  );
});

test("waits for successful asynchronous SFTP cleanup", async () => {
  const resolve = jest.fn();
  const reject = jest.fn();
  settleTransfer({
    state: { settled: false },
    cleanup: jest.fn(),
    sftp: {},
    operation: "download",
    result: "ok",
    closeSftp: () => Promise.resolve(),
    normalizeTransferError,
    resolve,
    reject,
  });
  await Promise.resolve();
  expect(resolve).toHaveBeenCalledWith("ok");
  expect(reject).not.toHaveBeenCalled();
});
