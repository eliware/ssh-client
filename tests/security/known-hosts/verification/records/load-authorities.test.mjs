import { expect, jest, test } from "@jest/globals";
import { readAuthorities } from "../../../../../src/security/known-hosts/verification/records/load-authorities.mjs";

test("loads and validates host authority records", async () => {
  const utils = { parseKey: (value) => ({ getPublicSSH: () => Buffer.from(value) }) };
  const readFile = jest.fn(async () => "# comment\nssh-ed25519 authority\n");
  const fsLib = { readFile };
  await expect(
    readAuthorities("~/.ssh/ca", fsLib, () => "C:/fixture/home", utils),
  ).resolves.toEqual(["ssh-ed25519 authority"]);
  expect(readFile).toHaveBeenCalledWith("C:/fixture/home/.ssh/ca", "utf8");
});
