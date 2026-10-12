import { createOutputState } from "./state.mjs";
import { appendOutput } from "./append.mjs";

export function createOutputCollector(maxOutput, getChannel) {
  const state = createOutputState();
  let onLimit;
  return {
    add(target, data) {
      const truncated = state.truncated;
      appendOutput(state, target, data, maxOutput, getChannel);
      if (!truncated && state.truncated) onLimit?.();
    },
    onLimit(handler) {
      onLimit = handler;
      if (state.truncated) handler();
    },
    get stdout() {
      return state.stdout;
    },
    get stderr() {
      return state.stderr;
    },
    get merged() {
      return state.merged;
    },
    get truncated() {
      return state.truncated;
    },
  };
}
