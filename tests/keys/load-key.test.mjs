import { expect, test, jest } from "@jest/globals";
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
