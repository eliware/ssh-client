import { expect, test } from "@jest/globals";
import {
  cancellationError,
  normalizeTransferError,
  timeoutError,
  transferSetupError,
} from "../../../src/transfer/session/errors.mjs";

test("normalizes setup, transfer, cancellation, and timeout errors", () => {
  expect(transferSetupError("upload", undefined, undefined)).toMatchObject({ code: "SSH_SFTP" });
  expect(transferSetupError("upload", "setup failed", undefined).message).toContain("setup failed");
  expect(transferSetupError("upload", Error("setup error"), {}).message).toContain("setup error");
  expect(normalizeTransferError("upload", Error("failed"))).toMatchObject({ code: "SSH_TRANSFER" });
  expect(normalizeTransferError("upload", "failed").message).toContain("failed");
  const existing = cancellationError("upload");
  expect(normalizeTransferError("upload", existing)).toBe(existing);
  expect(cancellationError("upload")).toMatchObject({ code: "SSH_CANCELLED" });
  expect(timeoutError("upload")).toMatchObject({ code: "SSH_TIMEOUT" });
});
