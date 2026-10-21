import { closeConnection } from "./close.mjs";
import { observeReusableClientState } from "./transport-state.mjs";
import { createOperationQueue } from "../../reusable/operation-queue.mjs";
import { createReusableOperations } from "../../reusable/operations.mjs";

export function createReusableClientApi(client, options) {
  let closePromise;
  const state = observeReusableClientState(client);
  const close = () => {
    if (closePromise) return closePromise;
    closePromise = closeConnection(client, (value) => state.set(value)).catch((error) => {
      closePromise = undefined;
      throw error;
    });
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
