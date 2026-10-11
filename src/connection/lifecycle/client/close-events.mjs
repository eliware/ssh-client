import { safelyDestroy } from "./destroy-fallback.mjs";

export function attachCloseEvents(client, finish) {
  const onClose = () => finish();
  const onEnd = () => {
    safelyDestroy(client);
    finish();
  };
  const onError = (error) => finish(error);
  client.once("close", onClose);
  client.once("end", onEnd);
  client.once("error", onError);
  return () => {
    try {
      client.removeListener?.("close", onClose);
      client.removeListener?.("end", onEnd);
      client.removeListener?.("error", onError);
    } catch {}
  };
}
