import { createCommandQueue } from "./queue.mjs";

export function createExecutionQueue(config, state, finish) {
  return createCommandQueue({
    commands: config.commands,
    maxOutput: config.maxOutput,
    commandTimeout: config.commandTimeout,
    keepAlive: config.keepAlive,
    get conn() {
      return state.conn;
    },
    cwd: config.cwd,
    env: config.env,
    envFallback: config.envFallback,
    pty: config.pty,
    results: state.results,
    finish,
    isSettled: () => state.settled,
    isTransportClosed: () => state.transportClosed,
    setCommandStarting: (value) => {
      state.commandStarting = value;
    },
    setActiveTimer: (value) => {
      state.activeCommandTimer = value;
    },
    clearActiveTimer: (value) => {
      if (value && state.activeCommandTimer === value) state.activeCommandTimer = undefined;
    },
  });
}
