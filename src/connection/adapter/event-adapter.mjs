import { signalReady } from "./signal-ready.mjs";

export function createClientEventAdapter(client) {
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
  };
}
