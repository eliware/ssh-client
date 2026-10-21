import { expect, jest, test } from "@jest/globals";
import {
  createStreamCompletion,
  prepareStreamCompletion,
} from "../../../src/shell/stream/completion.mjs";
test("resolves close once", async () => {
  const handlers = {};
  const stream = {
    once: (event, fn) => {
      handlers[event] = fn;
    },
    end: jest.fn(),
  };
  const completion = createStreamCompletion(stream, jest.fn());
  handlers.close(0, "SIGTERM");
  handlers.end();
  await expect(completion).resolves.toEqual({ code: 0, signal: "SIGTERM" });
});

test("uses a null exit code when the close event has no code", async () => {
  let close;
  const completion = createStreamCompletion({
    once: (event, callback) => {
      if (event === "close") close = callback;
    },
  });
  close(null);
  await expect(completion).resolves.toEqual({ code: null, signal: undefined });
});
test("rejects errors and closes", async () => {
  const stream = {
    once: (event, fn) => {
      stream[event] = fn;
    },
    end: jest.fn(),
  };
  const close = jest.fn();
  const completion = createStreamCompletion(stream, close);
  stream.error(Error("broken"));
  await expect(completion).rejects.toMatchObject({ code: "SSH_SHELL" });
  expect(close).toHaveBeenCalled();
});
test("supports streams without once", async () => {
  await expect(createStreamCompletion({}, jest.fn())).resolves.toEqual({ code: null });
});

test("prepares the stream completion promise", async () => {
  const handlers = {};
  const stream = { once: (event, callback) => (handlers[event] = callback) };
  const wrapClose = prepareStreamCompletion(stream);
  expect(stream.completion).toBeInstanceOf(Promise);
  wrapClose();
  handlers.end();
  await expect(stream.completion).resolves.toEqual({ code: null });
});

test("handles string errors without cleanup and ignores later errors", async () => {
  const handlers = {};
  const stream = { once: (event, callback) => (handlers[event] = callback) };
  const completion = createStreamCompletion(stream);
  handlers.error("broken");
  handlers.error(Error("late"));
  await expect(completion).rejects.toMatchObject({ message: "SSH shell error: broken" });
});
