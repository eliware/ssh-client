import { expect, jest, test } from "@jest/globals";
import { wrapStreamClose } from "../../../src/shell/stream/close.mjs";

test("wraps stream close and ends the stream", () => {
  const close = jest.fn();
  const end = jest.fn();
  const stream = { close, end };
  const wrapClose = wrapStreamClose(stream);
  expect(stream.close).toBe(close);
  wrapClose();
  stream.close();
  expect(close).toHaveBeenCalledTimes(1);
  expect(end).toHaveBeenCalledTimes(1);
});

test("wraps close when the stream has no close or end method", () => {
  const stream = {};
  wrapStreamClose(stream)();
  expect(() => stream.close()).not.toThrow();
});
