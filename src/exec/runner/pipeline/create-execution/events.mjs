import { createExecutionConnectionEvents } from "../connection-events.mjs";

export function createExecutionEvents(state, finish) {
  return createExecutionConnectionEvents({
    getConn: () => state.conn,
    finish,
    isEnded: () => state.ended,
    isSettled: () => state.settled,
    setTransportClosed: (value) => {
      state.transportClosed = value;
    },
    isCommandStarting: () => state.commandStarting,
    isCloseDeferred: () => state.closeDeferred,
    deferClose: () => {
      state.closeDeferred = true;
    },
  });
}
