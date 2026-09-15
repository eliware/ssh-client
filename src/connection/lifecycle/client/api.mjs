import { closeConnection } from './close.mjs';
import { createConnectionState } from '../../reusable/state.mjs';
import { createOperationQueue } from '../../reusable/operation-queue.mjs';
import { createReusableOperations } from '../../reusable/operations.mjs';

export function createReusableClientApi(client, options) {
  let closePromise;
  const state = createConnectionState();
  const operations = createReusableOperations({ client, options, state, serialize: createOperationQueue() });
  return {
    get state() { return state.value; },
    ...operations,
    close: () => {
      if (closePromise) return closePromise;
      closePromise = closeConnection(client, value => state.set(value));
      closePromise.catch(() => { closePromise = undefined; });
      return closePromise;
    },
  };
}
