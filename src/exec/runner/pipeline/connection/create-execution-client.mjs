import { SshError } from "../../../../errors.mjs";
import { createClient } from "../../../../connection/transport/create-client.mjs";
import { resolveClientClass } from "../transport.mjs";

const errorMessage = (error) => error?.message || String(error);

export function createExecutionClient(ClientClass) {
  let client;
  try {
    client = createClient(resolveClientClass(ClientClass));
  } catch (error) {
    throw new SshError(`SSH connection error: ${errorMessage(error)}`, "SSH_CONNECTION", error);
  }
  if (typeof client.on !== "function" || typeof client.connect !== "function")
    throw new SshError(
      "SSH client does not provide the required transport interface",
      "SSH_CONNECTION",
    );
  return client;
}
