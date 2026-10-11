import { createOutputState } from "./state.mjs";
import { appendOutput } from "./append.mjs";

export function createOutputCollector(maxOutput, getChannel) {
  const state = createOutputState();
  return {
    add: (target, data) => appendOutput(state, target, data, maxOutput, getChannel),
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
