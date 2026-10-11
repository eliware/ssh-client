import { expect, test, jest } from "@jest/globals";
import {
  attachConnectionLifecycle,
  detachConnectionLifecycle,
} from "../../../src/connection/lifecycle/events.mjs";

test("attaches and detaches lifecycle listeners", () => {
  const client = {
    once: jest.fn(() => client),
    on: jest.fn(() => client),
    removeListener: jest.fn(() => client),
  };
  const handlers = { onReady: jest.fn(), onError: jest.fn(), onEnd: jest.fn(), onClose: jest.fn() };
  expect(attachConnectionLifecycle(client, handlers)).toBe(client);
  detachConnectionLifecycle(client, handlers);
  expect(client.once).toHaveBeenCalledTimes(3);
  expect(client.on).toHaveBeenCalledWith("error", handlers.onError);
  expect(client.removeListener).toHaveBeenCalledTimes(4);
});

test("uses once when transport lacks on", () => {
  const client = { once: jest.fn(() => client) };
  attachConnectionLifecycle(client, { onReady() {}, onError() {}, onEnd() {}, onClose() {} });
  expect(client.once).toHaveBeenCalledTimes(4);
});
