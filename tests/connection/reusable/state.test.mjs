import { expect, test } from "@jest/globals";
import { createConnectionState } from "../../../src/connection/reusable/state.mjs";

test("tracks connection state and open status", () => {
  const state = createConnectionState();
  expect(state.value).toBe("open");
  expect(state.isOpen()).toBe(true);
  state.set("closing");
  expect(state.value).toBe("closing");
  expect(state.isOpen()).toBe(false);
});
