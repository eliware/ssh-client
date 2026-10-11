import { expect, test, jest } from "@jest/globals";
import { invokeUpload } from "../../../src/transfer/session/invoke-upload.mjs";

test("invokes SFTP upload with the configured mode", () => {
  const fastPut = jest.fn();
  const done = jest.fn();
  invokeUpload({ fastPut }, { localPath: "a", remotePath: "b" }, done);
  expect(fastPut).toHaveBeenCalledWith("a", "b", { mode: 0o600 }, done);
});
