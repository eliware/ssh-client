export function attachConnectionEvents(client, { onReady, onError, onClosed }) {
  client.on("ready", onReady).on("error", onError).on("end", onClosed).on("close", onClosed);
  return () => {
    client.removeListener?.("ready", onReady);
    client.removeListener?.("error", onError);
    client.removeListener?.("end", onClosed);
    client.removeListener?.("close", onClosed);
  };
}
