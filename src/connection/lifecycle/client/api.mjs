import { closeConnection } from "./close.mjs";
import { createConnectionState } from "../../reusable/state.mjs";
import { createOperationQueue } from "../../reusable/operation-queue.mjs";
import { createReusableOperations } from "../../reusable/operations.mjs";

export function createReusableClientApi(client, options) {
  let closePromise;
  const state = createConnectionState();
  const close = () => {
    if (closePromise) return closePromise;
    closePromise = closeConnection(client, (value) => state.set(value));
    return closePromise;
  };
  const operations = createReusableOperations({
    client,
    options,
    state,
    close,
    serialize: createOperationQueue(),
  });
  return {
    get state() {
      return state.value;
    },
    ...operations,
    close,
  };
}
