import { establishClient } from "./establish.mjs";
import { createReusableClientApi } from "./api.mjs";
import { prepareConnection } from "./options.mjs";
export async function connect(options = {}) {
  const prepared = await prepareConnection(options);
  const client = await establishClient(
    prepared.ClientClass,
    prepared.clientConfig,
    prepared.connectTimeout,
  );
  return createReusableClientApi(client, prepared.options);
}
