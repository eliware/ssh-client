import { expect, jest, test } from "@jest/globals";
import { createTransportErrorHandler } from "../../../../../src/exec/runner/pipeline/connection-events/error.mjs";

test("normalizes an active transport error", () => {
  const finish = jest.fn();
  createTransportErrorHandler({ finish, isEnded: () => false, isSettled: () => false })(
    Error("network"),
  );
  expect(finish).toHaveBeenCalledWith(expect.objectContaining({ code: "SSH_CONNECTION" }));
});

test.each([
  ["ended", true, false],
  ["settled", false, true],
])("ignores a transport error when the operation is %s", (_state, ended, settled) => {
  const finish = jest.fn();
  createTransportErrorHandler({ finish, isEnded: () => ended, isSettled: () => settled })(
    Error("late"),
  );
  expect(finish).not.toHaveBeenCalled();
});
