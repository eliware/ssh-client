import { expect, test } from "@jest/globals";
import { selectKeySources } from "../../src/keys/select-key-source.mjs";

test("selects explicit key paths before fallback sources", () => {
  expect(selectKeySources({ privateKeyPath: "/key", homedirFn: () => "/home" })).toEqual(["/key"]);
});

test("selects configured and default home key paths", () => {
  const previous = process.env.SSH_PRIVATE_KEY_PATH;
  process.env.SSH_PRIVATE_KEY_PATH = "/env-key";
  try {
    expect(selectKeySources({ homedirFn: () => "/home" })).toEqual([
      "/env-key",
      "\\home\\.ssh\\id_ed25519",
      "\\home\\.ssh\\id_rsa",
    ]);
  } finally {
    if (previous === undefined) delete process.env.SSH_PRIVATE_KEY_PATH;
    else process.env.SSH_PRIVATE_KEY_PATH = previous;
  }
});
