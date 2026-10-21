import { createConnectionState } from "../../reusable/state.mjs";

export function observeReusableClientState(client, state = createConnectionState()) {
  const markClosed = () => state.set("closed");
  client.once?.("end", markClosed);
  client.once?.("close", markClosed);
  client.once?.("error", markClosed);
  return state;
}
