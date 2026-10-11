import { expect, test } from "@jest/globals";
import { createOutputState } from "../../../../src/exec/commands/output/state.mjs";
test("creates empty output state", () => {
  expect(createOutputState()).toEqual({
    stdout: "",
    stderr: "",
    merged: "",
    stdoutBytes: 0,
    stderrBytes: 0,
    truncated: false,
  });
});
