import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { createCommandResult } from "../../../src/exec/commands/result.mjs";
import { sshExec } from "../../../src/exec/runner/pipeline/execute.mjs";

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-17T12:00:00.000Z"));
});
afterEach(() => jest.useRealTimers());

test("creates a normalized command result from exit and close state", () => {
  const result = createCommandResult({
    command: "run",
    stdout: "out",
    stderr: "err",
    merged: "out\nerr",
    maxOutput: 100,
    truncated: false,
    exitCode: undefined,
    closeCode: 0,
    exitSignal: undefined,
    closeSignal: "TERM",
    started: Date.now() - 5,
  });
  expect(result).toMatchObject({
    command: "run",
    stdout: "out",
    stderr: "err",
    code: 0,
    signal: "TERM",
    truncated: false,
  });
  expect(result.duration).toBeGreaterThanOrEqual(0);
});

test("maps pipeline output and result metadata", async () => {
  class OutputClient {
    on(event, fn) {
      this.handlers ??= {};
      this.handlers[event] = fn;
      return this;
    }
    connect() {
      this.handlers.ready();
    }
    end() {}
    exec(_, callback) {
      callback(null, {
        on(event, fn) {
          if (event === "exit") fn(7, "TERM");
          if (event === "close") queueMicrotask(() => fn(7, "TERM"));
          if (event === "data") {
            fn("abcdef");
            fn("abcdef");
            fn("abcdef");
          }
          return this;
        },
        stderr: {
          on(event, fn) {
            if (event === "data") fn("err");
            return this;
          },
        },
        close() {},
      });
    }
  }
  await expect(
    sshExec({
      host: "x",
      commands: ["run"],
      privateKey: "KEY",
      maxOutput: 3,
      ClientClass: OutputClient,
    }),
  ).resolves.toMatchObject([{ stdout: "abc", truncated: true, code: 7, signal: "TERM" }]);
});
