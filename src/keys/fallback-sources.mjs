import { join } from "node:path";

export function fallbackKeySources(homedirFn) {
  return [
    process.env.SSH_PRIVATE_KEY_PATH,
    join(homedirFn(), ".ssh", "id_ed25519"),
    join(homedirFn(), ".ssh", "id_rsa"),
  ].filter(Boolean);
}
