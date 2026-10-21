import { expect, test } from "@jest/globals";
import { validateRecordFields } from "../../../../../src/security/known-hosts/verification/records/parse.mjs";
import { parseRecordLine } from "../../../../../src/security/known-hosts/verification/records/line.mjs";

const utils = { parseKey: () => ({ getPublicSSH: () => ({}) }) };

test("validates plain and marked key records", () => {
  expect(validateRecordFields(parseRecordLine("router ssh-ed25519 key"), utils)).toEqual({
    invalid: false,
    keyRecord: "ssh-ed25519 key",
  });
  expect(validateRecordFields(parseRecordLine("@revoked router ssh-ed25519 key"), utils)).toEqual({
    invalid: false,
    keyRecord: "ssh-ed25519 key",
  });
});

test("rejects malformed fields and markers", () => {
  expect(validateRecordFields(parseRecordLine("router key"), utils)).toEqual({ invalid: true });
  expect(validateRecordFields(parseRecordLine("@unknown router ssh-ed25519 key"), utils)).toEqual({
    invalid: true,
  });
  expect(validateRecordFields(parseRecordLine("@revoked router ssh-ed25519"), utils)).toEqual({
    invalid: true,
  });
});

test.each([
  ["returns no parsed key", () => null],
  ["returns no public key", () => ({ getPublicSSH: () => undefined })],
  [
    "throws during key parsing",
    () => {
      throw Error("invalid key");
    },
  ],
])("rejects a marked record when parsing %s", (_case, parseKey) => {
  expect(
    validateRecordFields(parseRecordLine("@revoked router ssh-ed25519 key"), { parseKey }),
  ).toEqual({ invalid: true });
});
