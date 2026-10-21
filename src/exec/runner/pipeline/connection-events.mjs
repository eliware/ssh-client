import { createTransportCloseHandler } from "./connection-events/close.mjs";
import { createTransportErrorHandler } from "./connection-events/error.mjs";

export function createExecutionConnectionEvents({
  getConn,
  finish,
  isEnded,
  isSettled,
  setTransportClosed,
  isCommandStarting,
  isCloseDeferred,
  deferClose,
}) {
  const onError = createTransportErrorHandler({ finish, isEnded, isSettled });
  const onClosed = createTransportCloseHandler({
    getConn,
    finish,
    isEnded,
    setTransportClosed,
    isCommandStarting,
    isCloseDeferred,
    deferClose,
  });
  return { onError, onClosed };
}
