import { expect, test, jest } from "@jest/globals";
import { completeShellSetup } from "../../src/shell/completion.mjs";
import { SshError } from "../../src/errors.mjs";

test("completes successful and failed shell setup", () => {
  const values = [];
  expect(
    completeShellSetup({
      error: undefined,
      stream: {},
      settled: () => false,
      stop() {},
      attach() {},
      resolve: (value) => values.push(value),
      reject: () => {
        throw Error("unexpected");
      },
    }),
  ).toBe(true);
  expect(values).toHaveLength(1);
  const errors = [];
  expect(
    completeShellSetup({
      error: Error("failed"),
      settled: () => false,
      stream: undefined,
      stop() {},
      attach() {},
      resolve() {},
      reject: (error) => errors.push(error),
    }),
  ).toBe(false);
  expect(errors[0]).toMatchObject({ code: "SSH_SHELL" });
});
test("ignores settled streams and reports attachment failures", () => {
  const stream = { close: jest.fn() };
  expect(
    completeShellSetup({
      error: undefined,
      stream,
      settled: () => true,
      stop() {},
      attach() {},
      resolve() {},
      reject() {},
    }),
  ).toBe(false);
  expect(stream.close).toHaveBeenCalled();
  const errors = [];
  expect(
    completeShellSetup({
      error: undefined,
      stream: {},
      settled: () => false,
      stop() {},
      attach: () => {
        throw Error("attach");
      },
      resolve() {},
      reject: (error) => errors.push(error),
    }),
  ).toBe(false);
  expect(errors[0]).toMatchObject({ message: "attach" });
});
test("preserves normalized shell errors", () => {
  const error = new SshError("normalized", "SSH_SHELL");
  const received = [];
  completeShellSetup({
    error,
    stream: undefined,
    settled: () => false,
    stop() {},
    attach() {},
    resolve() {},
    reject: (value) => received.push(value),
  });
  expect(received[0]).toBe(error);
});
