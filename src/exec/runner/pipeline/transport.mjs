import ssh2 from "@eliware/ssh2";

const { Client } = ssh2;

export function resolveClientClass(clientClass) {
  return clientClass ?? Client;
}
