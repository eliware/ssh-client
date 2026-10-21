import { SshError } from "../../../errors.mjs";
import { attachConnectionLifecycle, detachConnectionLifecycle } from "../events.mjs";
import { startConnectionLifecycleTimeout } from "../timeout.mjs";
import { stopClient } from "../../../connection/transport/stop-client.mjs";

const errorMessage = (cause) => cause?.message || String(cause);

export function startClientEstablishment(client, config, timeout) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let connecting = false;
    let connectionStarted = false;
    let readyReceived = false;
    let timer;
    let ready;
    let error;
    let end;
    let close;
    const detach = () =>
      detachConnectionLifecycle(client, {
        onReady: ready,
        onError: error,
        onEnd: end,
        onClose: close,
      });
    const finish = (cause) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      detach();
      if (cause) reject(cause);
      else resolve(client);
    };
    ready = () => {
      readyReceived = true;
      if (connectionStarted && !connecting) finish();
    };
    error = (cause) => {
      if (!readyReceived)
        finish(
          new SshError(`SSH connection error: ${errorMessage(cause)}`, "SSH_CONNECTION", cause),
        );
    };
    end = () => {
      if (!readyReceived)
        finish(new SshError("SSH connection ended before setup completed", "SSH_CONNECTION"));
    };
    close = () => {
      if (!readyReceived)
        finish(new SshError("SSH connection closed before setup completed", "SSH_CONNECTION"));
    };
    attachConnectionLifecycle(client, {
      onReady: ready,
      onError: error,
      onEnd: end,
      onClose: close,
    });
    if (settled) {
      detach();
      return;
    }
    timer = startConnectionLifecycleTimeout(timeout, () => {
      finish(new SshError("SSH connection timed out", "SSH_TIMEOUT"));
      stopClient(client);
    });
    try {
      connectionStarted = true;
      connecting = true;
      client.connect(config);
      connecting = false;
      if (readyReceived) finish();
    } catch (cause) {
      connecting = false;
      if (readyReceived) finish();
      else
        finish(
          new SshError(`SSH connection error: ${errorMessage(cause)}`, "SSH_CONNECTION", cause),
        );
    }
  });
}
