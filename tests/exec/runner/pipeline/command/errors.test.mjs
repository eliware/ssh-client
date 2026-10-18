import { expect, jest, test } from "@jest/globals";
import {
  handleCommandError,
  handleStderrError,
  commandInvocationError,
} from "../../../../../src/exec/runner/pipeline/command/errors.mjs";

test("settles command and stderr errors once", () => {
  const context = { finish: jest.fn(), clearActiveTimer: jest.fn() };
  const mark = jest.fn();
  handleCommandError(context, Error("x"), () => false, mark);
  handleStderrError(context, Error("y"), undefined, () => false, mark);
  expect(context.finish).toHaveBeenCalledTimes(2);
  expect(commandInvocationError(Error("z"))).toMatchObject({ code: "SSH_EXEC" });
});
test("ignores errors after completion", () => {
  const context = { finish: jest.fn(), clearActiveTimer: jest.fn() };
  handleCommandError(context, Error("x"), () => true, jest.fn());
  handleStderrError(context, Error("y"), undefined, () => true, jest.fn());
  expect(context.finish).not.toHaveBeenCalled();
});
