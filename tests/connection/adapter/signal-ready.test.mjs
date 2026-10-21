import { expect, jest, test } from "@jest/globals";
import { signalReady } from "../../../src/connection/adapter/signal-ready.mjs";

test("signals readiness when the client supports events", () => {
  const emit = jest.fn();
  signalReady({ emit });
  expect(emit).toHaveBeenCalledWith("ready");
});

test("allows clients without an event method", () => {
  expect(() => signalReady({})).not.toThrow();
});
