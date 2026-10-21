import { createClientReadyAdapter } from "./ready.mjs";

export function createClientEventAdapter(client) {
  return {
    ...createClientReadyAdapter(client),
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
  };
}
