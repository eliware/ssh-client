import { expect, test } from "@jest/globals";
import { matches } from "../../../../src/security/known-hosts/matching/plain.mjs";

test("matches plain, wildcard, hashed, and negated patterns", () => {
  expect(matches("router", ["router"])).toBe(true);
  expect(matches("*.example.com", ["db.example.com"])).toBe(true);
  expect(matches("!router", ["router"])).toBe(false);
  expect(matches("|1|bad|bad", ["router"])).toBe(false);
});
