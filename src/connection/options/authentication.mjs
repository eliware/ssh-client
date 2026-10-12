import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { loadKey } from "../../keys/load-key.mjs";

export async function prepareAuthentication({
  privateKey,
  privateKeyPath,
  passphrase,
  password,
  agent,
  fsLib = fs,
  homedirFn = homedir,
}) {
  const keyRequired =
    privateKey !== undefined ||
    privateKeyPath !== undefined ||
    ((password === undefined || password === null) && !agent);
  const key = keyRequired
    ? await loadKey({ privateKey, privateKeyPath, fsLib, homedirFn })
    : undefined;
  return { key, passphrase, password, agent };
}
