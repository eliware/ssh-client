import { expect, test } from "@jest/globals";
import { validateTransferOptions } from "../../../src/transfer/options/validate.mjs";

test("validates transfer fields, modes, and timeouts", () => {
  expect(() =>
    validateTransferOptions({ localPath: "a", remotePath: "b" }, "upload", [
      "localPath",
      "remotePath",
    ]),
  ).not.toThrow();
  expect(() => validateTransferOptions(null, "upload", ["localPath", "remotePath"])).toThrow(
    "options",
  );
  expect(() =>
    validateTransferOptions({ localPath: "", remotePath: "b" }, "upload", [
      "localPath",
      "remotePath",
    ]),
  ).toThrow("options");
  expect(() =>
    validateTransferOptions({ localPath: "a", remotePath: "b", mode: -1 }, "upload", [
      "localPath",
      "remotePath",
    ]),
  ).toThrow("mode");
  expect(() =>
    validateTransferOptions({ localPath: "a", remotePath: "b", mode: 0o600 }, "upload", [
      "localPath",
      "remotePath",
    ]),
  ).not.toThrow();
  expect(() =>
    validateTransferOptions({ localPath: "a", remotePath: "b", timeout: -1 }, "upload", [
      "localPath",
      "remotePath",
    ]),
  ).toThrow("timeout");
});
