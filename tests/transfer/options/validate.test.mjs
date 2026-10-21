import { expect, test } from "@jest/globals";
import { validateTransferOptions } from "../../../src/transfer/options/validate.mjs";

test("validates shared transfer fields and timeouts", () => {
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
    validateTransferOptions({ localPath: "a", remotePath: "b", mode: -1 }, "download", [
      "remotePath",
      "localPath",
    ]),
  ).not.toThrow();
  expect(() =>
    validateTransferOptions({ localPath: "a", remotePath: "b", timeout: -1 }, "upload", [
      "localPath",
      "remotePath",
    ]),
  ).toThrow("timeout");
});
