import { expect, test, jest } from "@jest/globals";
import { invokeDownload } from "../../../../src/transfer/session/invoke/download.mjs";

test("invokes SFTP download", () => {
  const fastGet = jest.fn();
  const done = jest.fn();
  invokeDownload({ fastGet }, { remotePath: "b", localPath: "a" }, done);
  expect(fastGet).toHaveBeenCalledWith("b", "a", done);
});
