import { expect, test } from "@jest/globals";
import { quotePosix } from "../../../src/environment/quote/posix.mjs";

test("quotes POSIX values", () => {
  expect(quotePosix("/tmp/it's")).toBe("'/tmp/it'\\''s'");
});
