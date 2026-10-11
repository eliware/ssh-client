import { SshError } from "../../../errors.mjs";
import { attachCloseEvents } from "./close-events.mjs";
import { safelyDestroy, scheduleDestroyFallback } from "./destroy-fallback.mjs";

export function closeConnection(client, setState) {
  return new Promise((resolve, reject) => {
    setState("closing");
    let settled = false;
    let detachEvents;
    let fallback;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(fallback);
      detachEvents();
      setState("closed");
      if (error)
        reject(
          new SshError("SSH connection close failed", "SSH_CONNECTION", error, {
            operation: "close",
            phase: "cleanup",
          }),
        );
      else resolve();
    };
    detachEvents = attachCloseEvents(client, finish);
    fallback = scheduleDestroyFallback(client, finish);
    try {
      client.end();
    } catch {
      safelyDestroy(client);
      finish();
    }
  });
}
