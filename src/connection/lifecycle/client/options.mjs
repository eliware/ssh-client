import ssh2 from "@eliware/ssh2";
import { validateConnectionOptions } from "../../options/validate.mjs";
import { defaultConnectionTimeout } from "../../options/defaults.mjs";
import { prepareConnectionSecurity } from "../../options/prepare-connection-security.mjs";

const { Client } = ssh2;
export async function prepareConnection(options = {}) {
  const {
    host,
    port = 22,
    username = process.env.USER || process.env.USERNAME,
    passphrase,
    password,
    agent,
    knownHosts,
    ClientClass = Client,
  } = options;
  const connectTimeout = defaultConnectionTimeout(options.connectTimeout);
  validateConnectionOptions(
    { ...options, host, port, connectTimeout, ClientClass },
    connectTimeout,
  );
  const security = await prepareConnectionSecurity(options, Client);
  const { key, verifier } = security;
  return {
    options,
    ClientClass,
    connectTimeout,
    clientConfig: {
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
      authTimeout: connectTimeout,
    },
  };
}
