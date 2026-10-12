import { expect, test, jest } from "@jest/globals";
import { promises as fs } from "node:fs";
import { loadKey } from "../../src/keys/load-key.mjs";

test("returns inline keys without reading files", async () => {
  const fs = { readFile: jest.fn() };
  await expect(
    loadKey({ privateKey: "INLINE", privateKeyPath: "/key", fsLib: fs, homedirFn: () => "/home" }),
  ).resolves.toBe("INLINE");
  expect(fs.readFile).not.toHaveBeenCalled();
});

test("loads explicit and fallback keys and reports missing keys", async () => {
  await expect(
    loadKey({
      privateKey: "",
      privateKeyPath: "/key",
      fsLib: { readFile: jest.fn().mockResolvedValue("EXPLICIT") },
      homedirFn: () => "/home",
    }),
  ).resolves.toBe("EXPLICIT");
  await expect(
    loadKey({
      fsLib: { readFile: jest.fn().mockRejectedValue(Error("missing")) },
      homedirFn: () => "/home",
    }),
  ).rejects.toMatchObject({ code: "SSH_KEY_NOT_FOUND" });
});

test("uses the system file and home defaults when options are omitted", async () => {
  const readFile = jest.spyOn(fs, "readFile").mockRejectedValue(Error("missing"));
  try {
    await expect(loadKey()).rejects.toMatchObject({ code: "SSH_KEY_NOT_FOUND" });
    expect(readFile).toHaveBeenCalled();
  } finally {
    readFile.mockRestore();
  }
});
