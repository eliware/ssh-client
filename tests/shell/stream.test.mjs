import { expect, jest, test } from "@jest/globals";
import { openShell } from "../../src/shell.mjs";
import { attachShellStream } from "../../src/shell/stream.mjs";

test("attaches stream callbacks and resolves shell completion", async () => {
  const handlers = {};
  const close = jest.fn();
  const stream = {
    on(event, callback) {
      handlers[event] = callback;
      return this;
    },
    once(event, callback) {
      handlers[event] = callback;
      return this;
    },
    close,
    end: jest.fn(),
  };
  attachShellStream(stream);
  const attached = { ...handlers };
  const session = await openShell({ shell: (callback) => callback(null, stream), end: jest.fn() });
  attached.data("output");
  attached.error(Error("ignored stream error"));
  handlers.data("output");
  expect(session).toBeDefined();
  handlers.close(0);
  await expect(session.completion).resolves.toMatchObject({ code: 0 });
  stream.close();
  expect(close).toHaveBeenCalled();
  expect(stream.end).toHaveBeenCalled();
});
