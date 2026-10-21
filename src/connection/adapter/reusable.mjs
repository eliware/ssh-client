import { createClientEventAdapter } from "./event-adapter.mjs";
import { createClientOperationAdapter } from "./operation-adapter.mjs";

export function createReusableClientAdapter(client) {
  return {
    ...createClientEventAdapter(client),
    ...createClientOperationAdapter(client),
  };
}
