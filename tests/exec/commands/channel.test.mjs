import { expect, jest, test } from "@jest/globals";
import { attachChannel } from "../../../src/exec/commands/channel.mjs";

test("attaches stdout, stderr, exit, close, and error handlers", () => {
  const handlers = {};
  const stderrHandlers = {};
  const stream = {
    on(event, handler) {
      handlers[event] = handler;
      return this;
    },
    stderr: {
      on(event, handler) {
        stderrHandlers[event] = handler;
        return this;
      },
    },
  };
  const output = { add: jest.fn() };
  const onClose = jest.fn();
  const onError = jest.fn();
  const onStderrError = jest.fn();
  const state = attachChannel(stream, { output, onClose, onError, onStderrError });
  handlers.exit(7, "TERM");
  handlers.data("out");
  stderrHandlers.data("err");
  handlers.close(7, "TERM");
  handlers.error(Error("bad"));
  stderrHandlers.error(Error("stderr"));
  expect(output.add).toHaveBeenNthCalledWith(1, "stdout", "out");
  expect(output.add).toHaveBeenNthCalledWith(2, "stderr", "err");
  expect(state.exitCode).toBe(7);
  expect(state.exitSignal).toBe("TERM");
  expect(onClose).toHaveBeenCalledWith(7, "TERM");
  expect(onError).toHaveBeenCalled();
  expect(onStderrError).toHaveBeenCalled();
});
