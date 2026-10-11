import { join } from "node:path";

export function selectKeySources({ privateKeyPath, homedirFn }) {
  return privateKeyPath
    ? [privateKeyPath]
    : [
        process.env.SSH_PRIVATE_KEY_PATH,
        join(homedirFn(), ".ssh", "id_ed25519"),
        join(homedirFn(), ".ssh", "id_rsa"),
      ].filter(Boolean);
}
