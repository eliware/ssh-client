import { expect, test } from "@jest/globals";
import { parseAuthorities } from "../../../../../src/security/known-hosts/verification/records/parse-authorities.mjs";

test("parses authority records and skips blank and comment lines", () => {
  const utils = { parseKey: (value) => ({ getPublicSSH: () => Buffer.from(value) }) };
  expect(parseAuthorities("# comment\n\nssh-ed25519 authority extra\n", utils)).toEqual([
    "ssh-ed25519 authority",
  ]);
});

test("rejects malformed authority records", () => {
  const utils = { parseKey: () => ({}) };
  expect(() => parseAuthorities("bad record", utils)).toThrow("invalid host CA");
});
