import { SshError } from "../errors.mjs";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { readKeyFile } from "./read-key-file.mjs";
import { selectKeySources } from "./select-key-source.mjs";

export async function loadKey({
  privateKey,
  privateKeyPath,
  fsLib = fs,
  homedirFn = homedir,
} = {}) {
  if (privateKey) return privateKey;
  const key = await readKeyFile(selectKeySources({ privateKeyPath, homedirFn }), fsLib);
  if (key !== undefined) return key;
  throw new SshError(
    "No private key was found in ~/.ssh/. Set privateKey or privateKeyPath.",
    "SSH_KEY_NOT_FOUND",
  );
}
