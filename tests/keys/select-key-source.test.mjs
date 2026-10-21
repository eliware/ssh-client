import { expect, test } from "@jest/globals";
import { join } from "node:path";
import { selectKeySources } from "../../src/keys/select-key-source.mjs";

test("selects explicit key paths before fallback sources", () => {
  expect(selectKeySources({ privateKeyPath: "/key", homedirFn: () => "/home" })).toEqual(["/key"]);
});

test("selects fallback key sources", () => {
  const previous = process.env.SSH_PRIVATE_KEY_PATH;
  process.env.SSH_PRIVATE_KEY_PATH = "/env-key";
  try {
    expect(selectKeySources({ homedirFn: () => "/home" })).toEqual([
      "/env-key",
      join("/home", ".ssh", "id_ed25519"),
      join("/home", ".ssh", "id_rsa"),
    ]);
  } finally {
    if (previous === undefined) delete process.env.SSH_PRIVATE_KEY_PATH;
    else process.env.SSH_PRIVATE_KEY_PATH = previous;
  }
});
