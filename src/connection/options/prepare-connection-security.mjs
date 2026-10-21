import { prepareSecurity } from "./security.mjs";

export function prepareConnectionSecurity(options, defaultClient) {
  const {
    host,
    port = 22,
    ClientClass = defaultClient,
    fsLib,
    homedirFn,
    privateKey,
    privateKeyPath,
    passphrase,
    password,
    agent,
    hostVerifier,
    knownHosts,
    knownHostsPath,
    hostCaPath,
  } = options;
  return prepareSecurity({
    host,
    port,
    ClientClass,
    fsLib,
    homedirFn,
    privateKey,
    privateKeyPath,
    passphrase,
    password,
    agent,
    hostVerifier,
    knownHosts,
    knownHostsPath,
    hostCaPath,
    requireVerification: true,
    clientIsDefault: ClientClass === defaultClient,
  });
}
