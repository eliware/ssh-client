import { SshError } from "../../../errors.mjs";
import { completeExecution } from "./completion.mjs";
import { createExecutionEvents } from "./create-execution-events.mjs";
import { createExecutionQueue } from "./create-execution-queue.mjs";
import { createFinisher } from "./finisher.mjs";
import { startExecutionConnection } from "./connection.mjs";
import { prepareExecutionWithCancellation } from "./prepare-execution.mjs";

export async function sshExec(options = {}) {
  const config = await prepareExecutionWithCancellation(options);
  return new Promise((resolve, reject) => {
    const state = {
      get value() {
        return this.settled;
      },
      set value(value) {
        this.settled = value;
      },
      results: [],
      ended: false,
      commandStarting: false,
      closeDeferred: false,
      transportClosed: false,
      settled: false,
      readyHandled: false,
    };
    let connectionTimer;
    let detachConnectionEvents;
    const finish = createFinisher(state, (error) =>
      completeExecution({
        error,
        state,
        connectionTimer,
        activeCommandTimer: state.activeCommandTimer,
        signal: config.signal,
        abort,
        conn: state.conn,
        keepAlive: config.keepAlive,
        results: state.results,
        resolve,
        reject,
        detachConnectionEvents,
      }),
    );
    const abort = () =>
      finish(
        new SshError("SSH operation cancelled", "SSH_CANCELLED", undefined, {
          operation: "exec",
          phase: "queue",
        }),
      );
    if (config.signal) config.signal.addEventListener("abort", abort, { once: true });
    const next = createExecutionQueue(config, state, finish);
    const connectionEvents = createExecutionEvents(state, finish);
    try {
      const connection = startExecutionConnection(config, {
        onReady: () => {
          if (state.readyHandled || state.ended || state.transportClosed) return;
          state.readyHandled = true;
          clearTimeout(connectionTimer);
          next();
        },
        onError: connectionEvents.onError,
        onClosed: connectionEvents.onClosed,
        onTimeout: () =>
          connectionEvents.onError({ level: "client-timeout", message: "connection timeout" }),
        onConnectError: finish,
      });
      state.conn = connection.conn;
      connectionTimer = connection.timer;
      detachConnectionEvents = connection.detach;
      connection.connect();
    } catch (error) {
      finish(error);
    }
  });
}
