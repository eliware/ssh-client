import { expect, test } from "@jest/globals";
import { normalizeResultText } from "../../../../src/exec/commands/output/result-text.mjs";

test("normalizes merged output to the byte limit", () => {
  expect(normalizeResultText("hello", 3)).toBe("hel");
});

test("keeps complete characters within the byte limit", () => {
  expect(normalizeResultText("€x", 2)).toBe("");
  expect(normalizeResultText("€x", 3)).toBe("€");
});
