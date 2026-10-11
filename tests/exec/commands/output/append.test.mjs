import { expect, jest, test } from "@jest/globals";
import { appendOutput } from "../../../../src/exec/commands/output/append.mjs";
test("appends output and truncates at byte limit", () => {
  const state = {
    stdout: "",
    stderr: "",
    merged: "",
    stdoutBytes: 0,
    stderrBytes: 0,
    truncated: false,
  };
  const channel = { close: jest.fn() };
  appendOutput(state, "stdout", "hello", 3, () => channel);
  expect(state.stdout).toBe("hel");
  expect(state.merged).toBe("hel");
  expect(state.truncated).toBe(true);
  expect(channel.close).toHaveBeenCalled();
});
test("ignores output after truncation and closes at exhausted budget", () => {
  const state = {
    stdout: "",
    stderr: "",
    merged: "",
    stdoutBytes: 2,
    stderrBytes: 1,
    truncated: false,
  };
  const channel = { close: jest.fn() };
  appendOutput(state, "stderr", "x", 3, () => channel);
  expect(state.truncated).toBe(true);
  appendOutput(state, "stdout", "later", 3, () => channel);
  expect(state.merged).toBe("");
});
