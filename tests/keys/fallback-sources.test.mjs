import { expect, test } from "@jest/globals";
import { join } from "node:path";
import { fallbackKeySources } from "../../src/keys/fallback-sources.mjs";

test("uses the environment path before default home key paths", () => {
  const previous = process.env.SSH_PRIVATE_KEY_PATH;
  process.env.SSH_PRIVATE_KEY_PATH = "/env-key";
  try {
    expect(fallbackKeySources(() => "/home")).toEqual([
      "/env-key",
      join("/home", ".ssh", "id_ed25519"),
      join("/home", ".ssh", "id_rsa"),
    ]);
  } finally {
    if (previous === undefined) delete process.env.SSH_PRIVATE_KEY_PATH;
    else process.env.SSH_PRIVATE_KEY_PATH = previous;
  }
});

test("uses only default home key paths when no environment path exists", () => {
  const previous = process.env.SSH_PRIVATE_KEY_PATH;
  delete process.env.SSH_PRIVATE_KEY_PATH;
  try {
    expect(fallbackKeySources(() => "/home")).toEqual([
      join("/home", ".ssh", "id_ed25519"),
      join("/home", ".ssh", "id_rsa"),
    ]);
  } finally {
    if (previous === undefined) delete process.env.SSH_PRIVATE_KEY_PATH;
    else process.env.SSH_PRIVATE_KEY_PATH = previous;
  }
});
