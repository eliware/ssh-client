import { expect, test } from "@jest/globals";
import { validateTransferOperation } from "../../../src/transfer/options/operation.mjs";

test("validates upload modes and skips upload policy for downloads", () => {
  expect(() => validateTransferOperation({ mode: 0o600 }, "upload")).not.toThrow();
  expect(() => validateTransferOperation({ mode: -1 }, "download")).not.toThrow();
});
