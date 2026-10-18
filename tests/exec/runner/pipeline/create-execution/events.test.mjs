import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { createExecutionEvents } from "../../../../../src/exec/runner/pipeline/create-execution/events.mjs";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("maps every execution state to its connection event handlers", async () => {
  const finish = jest.fn();
  const state = {
    conn: { end: jest.fn() },
    ended: false,
    settled: false,
    commandStarting: false,
    closeDeferred: false,
  };
  const events = createExecutionEvents(state, finish);
  events.onError(Error("network"));
  events.onClosed();
  expect(state.conn.end).toHaveBeenCalledTimes(1);
  state.commandStarting = true;
  events.onClosed();
  expect(state.transportClosed).toBe(true);
  expect(state.closeDeferred).toBe(true);
  await jest.runAllTimersAsync();
  expect(finish).toHaveBeenCalledWith(expect.objectContaining({ code: "SSH_CONNECTION" }));
  state.ended = true;
  events.onClosed();
  expect(state.conn.end).toHaveBeenCalledTimes(1);
});
