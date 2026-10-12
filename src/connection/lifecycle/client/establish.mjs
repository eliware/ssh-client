import { SshError } from "../../../errors.mjs";
import { attachConnectionLifecycle, detachConnectionLifecycle } from "../events.mjs";
import { startConnectionLifecycleTimeout } from "../timeout.mjs";
import { stopClient } from "../../../connection/transport/stop-client.mjs";
import { validateClientTransport } from "../../../connection/transport/validate-client.mjs";
import { createClient } from "../../../connection/transport/create-client.mjs";
export function establishClient(ClientClass, config, timeout) {
  return new Promise((resolve, reject) => {
    let client;
    let settled = false;
    let timer;
    let ready;
    let error;
    let end;
    let close;
    const finish = (cause) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      detachConnectionLifecycle(client, {
        onReady: ready,
        onError: error,
        onEnd: end,
        onClose: close,
      });
      if (cause) reject(cause);
      else resolve(client);
    };
    try {
      client = createClient(ClientClass);
    } catch (cause) {
      finish(new SshError(`SSH connection error: ${cause.message}`, "SSH_CONNECTION", cause));
      return;
    }
    try {
      validateClientTransport(client);
    } catch (cause) {
      stopClient(client);
      return finish(cause);
    }
    ready = () => finish();
    error = (cause) =>
      finish(new SshError(`SSH connection error: ${cause.message}`, "SSH_CONNECTION", cause));
    end = () => finish(new SshError("SSH connection ended before ready", "SSH_CONNECTION"));
    close = () => finish(new SshError("SSH connection closed before ready", "SSH_CONNECTION"));
    attachConnectionLifecycle(client, {
      onReady: ready,
      onError: error,
      onEnd: end,
      onClose: close,
    });
    if (settled) {
      detachConnectionLifecycle(client, {
        onReady: ready,
        onError: error,
        onEnd: end,
        onClose: close,
      });
      return;
    }
    timer = startConnectionLifecycleTimeout(timeout, () => {
      finish(new SshError("SSH connection timed out", "SSH_TIMEOUT"));
      stopClient(client);
    });
    try {
      client.connect(config);
    } catch (cause) {
      finish(new SshError(`SSH connection error: ${cause.message}`, "SSH_CONNECTION", cause));
    }
  });
}
