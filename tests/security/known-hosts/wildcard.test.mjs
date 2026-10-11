import { expect, test } from "@jest/globals";
import { matchesWildcard } from "../../../src/security/known-hosts/wildcard.mjs";

test("matches wildcard, question-mark, escaped, and literal patterns", () => {
  expect(matchesWildcard("*.example", "router.example")).toBe(true);
  expect(matchesWildcard("router?example", "router.example")).toBe(true);
  expect(matchesWildcard("router\\*example", "router*example")).toBe(true);
  expect(matchesWildcard("foo[bar].example", "foo[bar].example")).toBe(true);
  expect(matchesWildcard("router?example", "router.example.test")).toBe(false);
});
