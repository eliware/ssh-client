import { SshError } from "../../../errors.mjs";
import { attachConnectionEvents } from "../../connection/events.mjs";
import { startConnectionTimeout } from "../../connection/timeout.mjs";
import { createExecutionClient } from "./connection/create-execution-client.mjs";

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
  const conn = createExecutionClient(ClientClass);
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
