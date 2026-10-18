export function attachConnectionLifecycle(client, handlers) {
  const { onReady, onError, onEnd, onClose } = handlers;
  client.once("ready", onReady);
  if (typeof client.on === "function") client.on("error", onError);
  else client.once("error", onError);
  client.once("end", onEnd);
  client.once("close", onClose);
  return client;
}

export function detachConnectionLifecycle(client, handlers) {
  try {
    client?.removeListener?.("ready", handlers.onReady);
    client?.removeListener?.("error", handlers.onError);
    client?.removeListener?.("end", handlers.onEnd);
    client?.removeListener?.("close", handlers.onClose);
  } catch {
    // Listener cleanup can fail when a transport omits this method.
  }
}
