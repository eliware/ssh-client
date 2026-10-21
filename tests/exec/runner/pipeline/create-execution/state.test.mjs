import { expect, test } from "@jest/globals";
import { createExecutionState } from "../../../../../src/exec/runner/pipeline/create-execution/state.mjs";

test("creates independent execution state with initial values", () => {
  const state = createExecutionState();
  const anotherState = createExecutionState();

  expect(state).toMatchObject({
    results: [],
    ended: false,
    commandStarting: false,
    closeDeferred: false,
    transportClosed: false,
    settled: false,
    readyHandled: false,
  });
  expect(state.results).not.toBe(anotherState.results);
});

test("maps the value property to settled state", () => {
  const state = createExecutionState();

  expect(state.value).toBe(false);
  state.value = true;
  expect(state.settled).toBe(true);
  expect(state.value).toBe(true);
});
