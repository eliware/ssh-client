import { expect, test } from "@jest/globals";
import {
  SshError,
  loadKey,
  expandPath,
  createHostVerifier,
  sshExec,
  connect,
  upload,
  download,
} from "../src/public-api.mjs";

test("exports the documented public API", () => {
  expect(SshError).toBeDefined();
  for (const api of [loadKey, expandPath, createHostVerifier, sshExec, connect, upload, download]) {
    expect(typeof api).toBe("function");
  }
});
