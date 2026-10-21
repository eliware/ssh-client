import { expect, test } from "@jest/globals";
import { parseRecordLine } from "../../../../../src/security/known-hosts/verification/records/line.mjs";

test("parses plain and marked record lines", () => {
  expect(parseRecordLine("router.example ssh-ed25519 key")).toMatchObject({
    marker: "",
    patterns: ["router.example"],
  });
  expect(parseRecordLine("@revoked router.example ssh-ed25519 key")).toMatchObject({
    marker: "@revoked",
    patterns: ["router.example"],
  });
});

test("skips blank and comment lines and marker-only records", () => {
  expect(parseRecordLine("  ")).toBeUndefined();
  expect(parseRecordLine("# comment")).toBeUndefined();
  expect(parseRecordLine("@revoked")).toBeUndefined();
});
