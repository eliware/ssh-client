import { expect, test } from "@jest/globals";
import {
  channelError,
  commandError,
  stderrError,
} from "../../../../src/exec/runner/pipeline/errors.mjs";

test("maps channel, command, and stderr failures with context", () => {
  expect(channelError({ message: "unavailable" })).toMatchObject({
    code: "SSH_EXEC",
    context: { operation: "exec", phase: "channel" },
  });
  expect(commandError({ message: "failed" })).toMatchObject({ code: "SSH_EXEC" });
  expect(stderrError({ message: "failed" })).toMatchObject({
    code: "SSH_EXEC",
    context: { operation: "exec", phase: "stderr" },
  });
  expect(channelError({})).toMatchObject({ code: "SSH_EXEC" });
});
