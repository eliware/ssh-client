import { expect, jest, test } from "@jest/globals";
import { upload } from "../../src/transfer/upload.mjs";
import { download } from "../../src/transfer/download.mjs";
import { runTransfer } from "../../src/transfer/session.mjs";

test("runTransfer resolves results and reports setup errors", async () => {
  const handle = {
    end() {},
    fastPut: (_a, _b, _options, done) => done(),
    fastGet: (_a, _b, done) => done(),
  };
  const client = { sftp: (callback) => callback(null, handle) };
  await expect(
    runTransfer(client, {}, "upload", (_sftp, finish) => finish(null, "done")),
  ).resolves.toBe("done");
  await expect(upload(client, { localPath: "a", remotePath: "b" })).resolves.toBeUndefined();
  await expect(download(client, { localPath: "a", remotePath: "b" })).resolves.toBeUndefined();
  await expect(
    runTransfer({ sftp: (callback) => callback(Error("failed")) }, {}, "upload", () => {}),
  ).rejects.toBeDefined();
});

test("rejects setup without a handle and catches operation setup errors", async () => {
  await expect(
    runTransfer({ sftp: (callback) => callback(null) }, {}, "download", () => {}),
  ).rejects.toMatchObject({ code: "SSH_SFTP", context: { phase: "setup" } });
  const handle = { end() {} };
  await expect(
    runTransfer({ sftp: (callback) => callback(null, handle) }, {}, "upload", () => {
      throw Error("start failed");
    }),
  ).rejects.toMatchObject({ code: "SSH_TRANSFER" });
});

test("cancels before SFTP setup and closes a handle that arrives late", async () => {
  const controller = new AbortController();
  let callback;
  const client = { sftp: (done) => (callback = done) };
  const pending = runTransfer(client, { signal: controller.signal }, "upload", () => {});
  const rejection = expect(pending).rejects.toMatchObject({ code: "SSH_CANCELLED" });
  controller.abort();
  await rejection;
  const handle = { end: jest.fn() };
  callback(null, handle);
  expect(handle.end).toHaveBeenCalled();
});

test("cancels immediately when the signal is already aborted", async () => {
  const controller = new AbortController();
  controller.abort();
  const sftp = jest.fn();
  await expect(
    runTransfer({ sftp }, { signal: controller.signal }, "download", () => {}),
  ).rejects.toMatchObject({ code: "SSH_CANCELLED" });
  expect(sftp).not.toHaveBeenCalled();
});

test("closes an active SFTP handle once after cancellation", async () => {
  const controller = new AbortController();
  const handle = { end: jest.fn() };
  const pending = runTransfer(
    { sftp: (callback) => callback(null, handle) },
    { signal: controller.signal },
    "upload",
    () => {},
  );
  const rejected = expect(pending).rejects.toMatchObject({ code: "SSH_CANCELLED" });
  controller.abort();
  await rejected;
  expect(handle.end).toHaveBeenCalledTimes(1);
});

test("closes an active SFTP handle once after timeout", async () => {
  jest.useFakeTimers();
  const handle = { end: jest.fn() };
  const pending = runTransfer(
    { sftp: (callback) => callback(null, handle) },
    { timeout: 5 },
    "upload",
    () => {},
  );
  const rejected = expect(pending).rejects.toMatchObject({ code: "SSH_TIMEOUT" });
  await jest.advanceTimersByTimeAsync(5);
  await rejected;
  expect(handle.end).toHaveBeenCalledTimes(1);
  jest.useRealTimers();
});

test("times out while SFTP setup is pending", async () => {
  jest.useFakeTimers();
  const pending = runTransfer({ sftp() {} }, { timeout: 5 }, "upload", () => {});
  const rejection = expect(pending).rejects.toMatchObject({ code: "SSH_TIMEOUT" });
  await jest.advanceTimersByTimeAsync(5);
  await rejection;
  jest.useRealTimers();
});
