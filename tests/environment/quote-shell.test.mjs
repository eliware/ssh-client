import { expect, test } from "@jest/globals";
import { quoteShell } from "../../src/environment/quote-shell.mjs";

test("selects the requested shell quoting policy", () => {
  expect(quoteShell("value")).toBe("'value'");
  expect(quoteShell("C:\\temp\\it's", "powershell")).toBe("'C:\\temp\\it''s'");
  expect(quoteShell('C:\\temp\\x"y', "cmd")).toBe('"C:\\temp\\x""y"');
});
