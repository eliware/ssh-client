import { expect, test } from "@jest/globals";
import {
  parseRecordLine,
  validateRecordFields,
} from "../../../../../src/security/known-hosts/verification/records/parse.mjs";

const utils = { parseKey: () => ({ getPublicSSH: () => ({}) }) };

test("parses plain and marked record fields", () => {
  expect(parseRecordLine("router.example ssh-ed25519 key")).toMatchObject({
    marker: "",
    patterns: ["router.example"],
  });
  expect(parseRecordLine("@revoked router.example ssh-ed25519 key")).toMatchObject({
    marker: "@revoked",
    patterns: ["router.example"],
  });
  expect(validateRecordFields(parseRecordLine("router ssh-ed25519 key"), utils)).toEqual({
    invalid: false,
    keyRecord: "ssh-ed25519 key",
  });
  expect(validateRecordFields(parseRecordLine("@revoked router ssh-ed25519 key"), utils)).toEqual({
    invalid: false,
    keyRecord: "ssh-ed25519 key",
  });
});

test("skips blank and comment lines and marker-only records", () => {
  expect(parseRecordLine("  ")).toBeUndefined();
  expect(parseRecordLine("# comment")).toBeUndefined();
  expect(parseRecordLine("@revoked")).toBeUndefined();
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
