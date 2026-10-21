import { SshError } from "../../../../errors.mjs";

export function createTransportCloseHandler({
  getConn,
  finish,
  isEnded,
  setTransportClosed,
  isCommandStarting,
  isCloseDeferred,
  deferClose,
}) {
  return function onClosed() {
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
}
