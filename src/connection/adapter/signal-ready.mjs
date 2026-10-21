export function signalReady(client) {
  client.emit?.("ready");
}
