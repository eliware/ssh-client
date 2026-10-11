import { expect, test } from "@jest/globals";
import { createHmac } from "node:crypto";
import { matchesHashed } from "../../../src/security/known-hosts/hashed.mjs";

test("matches valid hashed hosts and rejects malformed or incorrect hashes", () => {
  const saltBytes = Buffer.alloc(20, 7);
  const salt = saltBytes.toString("base64");
  const digest = createHmac("sha1", saltBytes).update("router.example").digest("base64");
  expect(matchesHashed(`|1|${salt}|${digest}`, ["router.example"])).toBe(true);
  expect(
    matchesHashed(`|1|${salt}|${Buffer.alloc(20, 8).toString("base64")}`, ["router.example"]),
  ).toBe(false);
  expect(matchesHashed(`|1|${salt}|bad`, ["router.example"])).toBe(false);
  expect(matchesHashed("|1||", ["router.example"])).toBe(false);
  expect(
    matchesHashed(`|1|${Buffer.alloc(19, 7).toString("base64")}|${digest}`, ["router.example"]),
  ).toBe(false);
});
