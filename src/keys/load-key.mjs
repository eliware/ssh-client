import { SshError } from "../errors.mjs";
import { readKeyFile } from "./read-key-file.mjs";
import { selectKeySources } from "./select-key-source.mjs";

export async function loadKey({ privateKey, privateKeyPath, fsLib, homedirFn }) {
  if (privateKey) return privateKey;
  const key = await readKeyFile(selectKeySources({ privateKeyPath, homedirFn }), fsLib);
  if (key !== undefined) return key;
  throw new SshError(
    "No private key found in ~/.ssh/; provide privateKey or privateKeyPath.",
    "SSH_KEY_NOT_FOUND",
  );
}
