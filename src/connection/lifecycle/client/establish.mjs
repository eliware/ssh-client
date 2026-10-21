import { SshError } from "../../../errors.mjs";
import { stopClient } from "../../../connection/transport/stop-client.mjs";
import { validateClientTransport } from "../../../connection/transport/validate-client.mjs";
import { createClient } from "../../../connection/transport/create-client.mjs";
import { startClientEstablishment } from "./establishment.mjs";

const errorMessage = (cause) => cause?.message || String(cause);

export function establishClient(ClientClass, config, timeout) {
  let client;
  try {
    client = createClient(ClientClass);
  } catch (cause) {
    return Promise.reject(
      new SshError(`SSH connection error: ${errorMessage(cause)}`, "SSH_CONNECTION", cause),
    );
  }
  try {
    validateClientTransport(client);
  } catch (cause) {
    stopClient(client);
    return Promise.reject(cause);
  }
  return startClientEstablishment(client, config, timeout);
}
