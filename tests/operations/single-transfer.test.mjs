import { expect, jest, test } from "@jest/globals";
import { singleTransfer } from "../../src/operations/single-transfer.mjs";

test("connects, runs a transfer, closes, and writes operation records", async () => {
  const transfer = jest.fn().mockResolvedValue("copied");
  const close = jest.fn().mockResolvedValue(undefined);
  const connect = jest.fn().mockResolvedValue({ upload: transfer, close });
  const logger = { debug: jest.fn(), info: jest.fn(), error: jest.fn() };
  const options = { host: "router", privateKey: "KEY", localPath: "local", logger };

  await expect(singleTransfer("upload", options, connect)).resolves.toBe("copied");
  expect(connect).toHaveBeenCalledWith({ host: "router", privateKey: "KEY", localPath: "local" });
  expect(transfer).toHaveBeenCalledWith(options);
  expect(close).toHaveBeenCalledTimes(1);
  expect(logger.info).toHaveBeenCalledWith("upload completed", {
    operation: "upload",
    host: "router",
    port: 22,
  });
});

test("closes the connection and logs a failed transfer", async () => {
  const failure = Error("copy failed");
  const transfer = jest.fn().mockRejectedValue(failure);
  const close = jest.fn().mockResolvedValue(undefined);
  const connect = jest.fn().mockResolvedValue({ download: transfer, close });
  const logger = { debug: jest.fn(), info: jest.fn(), error: jest.fn() };

  await expect(singleTransfer("download", { host: "router", logger }, connect)).rejects.toBe(
    failure,
  );
  expect(close).toHaveBeenCalledTimes(1);
  expect(logger.error).toHaveBeenCalledWith(
    "download failed",
    expect.objectContaining({ operation: "download", host: "router" }),
  );
});
