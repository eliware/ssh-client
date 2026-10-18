import { SshError } from "../../../errors.mjs";
import { attachConnectionLifecycle, detachConnectionLifecycle } from "../events.mjs";
import { startConnectionLifecycleTimeout } from "../timeout.mjs";
import { stopClient } from "../../../connection/transport/stop-client.mjs";
import { validateClientTransport } from "../../../connection/transport/validate-client.mjs";
import { createClient } from "../../../connection/transport/create-client.mjs";

const errorMessage = (cause) => cause?.message || String(cause);

export function establishClient(ClientClass, config, timeout) {
  return new Promise((resolve, reject) => {
    let client;
    let settled = false;
    let connecting = false;
    let readyReceived = false;
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
      finish(new SshError(`SSH connection error: ${errorMessage(cause)}`, "SSH_CONNECTION", cause));
      return;
    }
    try {
      validateClientTransport(client);
    } catch (cause) {
      stopClient(client);
      return finish(cause);
    }
    ready = () => {
      readyReceived = true;
      if (!connecting) finish();
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
    if (settled || readyReceived) {
      finish();
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
      connecting = true;
      client.connect(config);
      connecting = false;
      if (readyReceived) finish();
    } catch (cause) {
      connecting = false;
      finish(new SshError(`SSH connection error: ${errorMessage(cause)}`, "SSH_CONNECTION", cause));
    }
  });
}
