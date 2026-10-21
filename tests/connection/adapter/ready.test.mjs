import { expect, jest, test } from "@jest/globals";
import { createClientReadyAdapter } from "../../../src/connection/adapter/ready.mjs";

test("signals readiness when connect runs", () => {
  const emit = jest.fn();
  const adapter = createClientReadyAdapter({ emit });

  adapter.connect();

  expect(emit).toHaveBeenCalledWith("ready");
});

test("allows clients without an event method", () => {
  const adapter = createClientReadyAdapter({});

  expect(() => adapter.connect()).not.toThrow();
});
