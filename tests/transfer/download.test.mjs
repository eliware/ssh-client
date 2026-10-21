import { expect, test } from "@jest/globals";
import { download } from "../../src/transfer/download.mjs";

test("exposes download as a function", () => {
  expect(download).toEqual(expect.any(Function));
});
test("starts a download with a valid options object", async () => {
  await expect(
    download(
      { sftp: (callback) => callback(null, { fastGet: (_, __, done) => done(), end() {} }) },
      { remotePath: "b", localPath: "a" },
    ),
  ).resolves.toBeUndefined();
});
