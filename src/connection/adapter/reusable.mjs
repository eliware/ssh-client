import { signalReady } from "./signal-ready.mjs";
import { stopClient } from "../transport/stop-client.mjs";

export function createReusableClientAdapter(client) {
  return {
    on(...args) {
      client.on(...args);
      return this;
    },
    removeListener(...args) {
      client.removeListener?.(...args);
      return this;
    },
    once(...args) {
      client.once(...args);
      return this;
    },
    emit(...args) {
      client.emit?.(...args);
      return this;
    },
    connect() {
      signalReady(client);
    },
    end() {
      stopClient(client);
    },
    destroy() {
      client.destroy?.();
    },
    exec(...args) {
      return client.exec(...args);
    },
    sftp(...args) {
      return client.sftp(...args);
    },
  };
}
