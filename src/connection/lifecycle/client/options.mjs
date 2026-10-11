import ssh2 from "@eliware/ssh2";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { validateConnectionOptions } from "../../options/validate.mjs";
import { defaultConnectionTimeout } from "../../options/defaults.mjs";
import { prepareSecurity } from "../../../connection/options/security.mjs";

const { Client } = ssh2;
export async function prepareConnection(options = {}) {
  const {
    host,
    port = 22,
    username = process.env.USER || process.env.USERNAME,
    privateKey,
    privateKeyPath,
    passphrase,
    password,
    agent,
    knownHosts,
    knownHostsPath,
    hostCaPath,
    ClientClass = Client,
    fsLib = fs,
    homedirFn = homedir,
  } = options;
  const connectTimeout = defaultConnectionTimeout(options.connectTimeout);
  validateConnectionOptions(
    { ...options, host, port, connectTimeout, ClientClass },
    Client,
    connectTimeout,
  );
  const security = await prepareSecurity({
    privateKey,
    privateKeyPath,
    passphrase,
    password,
    agent,
    hostVerifier: options.hostVerifier,
    host,
    port,
    knownHosts,
    knownHostsPath,
    hostCaPath,
    fsLib,
    homedirFn,
    requireVerification: true,
    clientIsDefault: ClientClass === Client,
  });
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
