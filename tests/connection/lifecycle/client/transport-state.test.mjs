import { expect, test } from "@jest/globals";
import { EventEmitter } from "node:events";
import { observeReusableClientState } from "../../../../src/connection/lifecycle/client/transport-state.mjs";

test.each(["end", "close", "error"])("marks reusable state closed on %s", (event) => {
  const client = new EventEmitter();
  const state = observeReusableClientState(client);
  expect(state.value).toBe("open");
  client.emit(event, Error("transport ended"));
  expect(state.value).toBe("closed");
});
