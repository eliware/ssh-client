import { signalReady } from "./signal-ready.mjs";

export function createClientReadyAdapter(client) {
  return {
    connect() {
      signalReady(client);
    },
  };
}
