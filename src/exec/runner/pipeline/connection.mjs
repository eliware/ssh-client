import { SshError } from "../../../errors.mjs";
import { attachConnectionEvents } from "../../connection/events.mjs";
import { startConnectionTimeout } from "../../connection/timeout.mjs";
import { resolveClientClass } from "./transport.mjs";

export function startExecutionConnection(config, handlers) {
  const {
    ClientClass,
    host,
    port,
    username,
    key,
    passphrase,
    password,
    agent,
    verifier,
    knownHosts,
    connectTimeout,
  } = config;
  let conn;
  try {
    conn = new (resolveClientClass(ClientClass))();
  } catch (error) {
    throw new SshError(
      `SSH connection error: ${error.message || String(error)}`,
      "SSH_CONNECTION",
      error,
    );
  }
  if (typeof conn.on !== "function" || typeof conn.connect !== "function")
    throw new SshError(
      "SSH client does not implement the required transport interface",
      "SSH_CONNECTION",
    );
  const timer = startConnectionTimeout(connectTimeout, handlers.onTimeout);
  const onReady = () => {
    clearTimeout(timer);
    handlers.onReady();
  };
  const detach = attachConnectionEvents(conn, { ...handlers, onReady });
  const connect = () => {
    try {
      conn.connect({
        host,
        port,
        username,
        privateKey: key,
        passphrase,
        password,
        agent,
        hostVerifier: verifier,
        knownHosts,
        readyTimeout: connectTimeout,
      });
    } catch (error) {
      clearTimeout(timer);
      handlers.onConnectError(
        new SshError(`SSH connection error: ${error.message}`, "SSH_CONNECTION", error),
      );
    }
  };
  return { conn, timer, connect, detach };
}
