import { expect, test } from "@jest/globals";
import { validateUploadMode } from "../../../src/transfer/options/validate-upload-mode.mjs";

test("accepts an unset or valid upload permission mode", () => {
  expect(() => validateUploadMode({})).not.toThrow();
  expect(() => validateUploadMode({ mode: 0o600 })).not.toThrow();
  expect(() => validateUploadMode({ mode: 0o7777 })).not.toThrow();
});

test.each([-1, 0o10000, 1.5, "600"])("rejects invalid upload mode %s", (mode) => {
  expect(() => validateUploadMode({ mode })).toThrow("upload mode");
});
