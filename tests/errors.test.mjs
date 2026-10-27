import { expect, test } from "@jest/globals";
import { SshError } from "../src/errors.mjs";
test("creates an SSH error with code and cause", () => {
  const cause = Error("cause");
  const error = new SshError("failed", "SSH_TEST", cause);
  expect(error).toMatchObject({
    name: "SshError",
    code: "SSH_TEST",
    cause,
    context: { operation: "unknown", phase: "unknown" },
  });
});

test("keeps explicit error context values", () => {
  const error = new SshError("failed", "SSH_TEST", undefined, {
    operation: "connect",
    phase: "setup",
    detail: "host verification",
  });
  expect(error.context).toEqual({
    operation: "connect",
    phase: "setup",
    detail: "host verification",
  });
});
