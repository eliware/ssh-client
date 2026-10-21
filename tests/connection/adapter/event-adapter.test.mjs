import { expect, test } from "@jest/globals";
import { createClientEventAdapter } from "../../../src/connection/adapter/event-adapter.mjs";

test("forwards transport event methods and signals readiness", () => {
  const calls = [];
  const client = {
    on: (...args) => calls.push(["on", args]),
    removeListener: (...args) => calls.push(["remove", args]),
    once: (...args) => calls.push(["once", args]),
    emit: (...args) => calls.push(["emit", args]),
  };
  const adapter = createClientEventAdapter(client);
  expect(adapter.on("a", 1)).toBe(adapter);
  expect(adapter.removeListener("a", 1)).toBe(adapter);
  expect(adapter.once("a", 1)).toBe(adapter);
  expect(adapter.emit("a", 1)).toBe(adapter);
  adapter.connect();
  expect(calls.map(([name]) => name)).toEqual(["on", "remove", "once", "emit", "emit"]);
  expect(calls.at(-1)[1]).toEqual(["ready"]);
});
