import { expect, test } from "@jest/globals";
import { requestShell } from "../../src/shell/request.mjs";

test("requests a shell with PTY options and normalizes synchronous failures", () => {
  let args;
  requestShell(
    {
      shell: (...values) => {
        args = values;
      },
    },
    { term: "xterm", cols: 160, rows: 48 },
    () => {},
    (error) => {
      throw error;
    },
  );
  expect(args[0]).toEqual({ term: "xterm", cols: 160, rows: 48 });
  expect(args[1]).toEqual(expect.any(Function));
  const errors = [];
  requestShell(
    {
      shell: () => {
        throw Error("shell");
      },
    },
    undefined,
    () => {},
    (error) => errors.push(error),
  );
  expect(errors[0]).toMatchObject({ code: "SSH_SHELL" });
});
