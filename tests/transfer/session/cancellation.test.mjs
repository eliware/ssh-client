import { expect, test, jest } from "@jest/globals";
import {
  attachTransferCancellation,
  detachTransferCancellation,
} from "../../../src/transfer/session/cancellation.mjs";

test("attaches and detaches cancellation handlers", () => {
  const controller = new AbortController();
  const cancel = jest.fn();
  attachTransferCancellation(controller.signal, cancel);
  controller.abort();
  expect(cancel).toHaveBeenCalledTimes(1);
  detachTransferCancellation(controller.signal, cancel);
});

test("handles an already aborted signal", () => {
  const controller = new AbortController();
  controller.abort();
  const cancel = jest.fn();
  attachTransferCancellation(controller.signal, cancel);
  expect(cancel).toHaveBeenCalledTimes(1);
});
