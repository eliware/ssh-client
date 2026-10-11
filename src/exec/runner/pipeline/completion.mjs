export function completeExecution({
  error,
  state,
  connectionTimer,
  activeCommandTimer,
  signal,
  abort,
  conn,
  keepAlive,
  results,
  resolve,
  reject,
  detachConnectionEvents,
}) {
  clearTimeout(connectionTimer);
  clearTimeout(activeCommandTimer);
  signal?.removeEventListener("abort", abort);
  detachConnectionEvents?.();
  if (error) {
    if (!state.ended && !state.transportClosed && !keepAlive) {
      state.ended = true;
      try {
        conn?.end?.();
      } catch {
        conn?.destroy?.();
      }
    }
    reject(error);
    return;
  }
  if (!state.ended && !keepAlive) {
    state.ended = true;
    try {
      conn?.end?.();
    } catch {
      conn?.destroy?.();
    }
  }
  resolve(results);
}
