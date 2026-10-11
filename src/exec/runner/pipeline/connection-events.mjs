import { SshError } from "../../../errors.mjs";
import { connectionError as createConnectionError } from "../../connection/errors.mjs";

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
  const onError = (error) => {
    if (!isEnded() && !isSettled()) finish(createConnectionError(error));
  };
  const onClosed = () => {
    setTransportClosed(true);
    if (isCommandStarting()) {
      if (isCloseDeferred())
        return finish(new SshError("SSH connection closed during channel setup", "SSH_CONNECTION"));
      deferClose();
      setImmediate(onClosed);
      return;
    }
    if (!isEnded()) {
      try {
        getConn()?.end?.();
      } catch {}
      finish(new SshError("SSH connection closed unexpectedly", "SSH_CONNECTION"));
    }
  };
  return { onError, onClosed };
}
