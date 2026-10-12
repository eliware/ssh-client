import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import ssh2 from "@eliware/ssh2";
import { createHostVerifier } from "../../security/known-hosts/verification/verifier.mjs";
import { adaptHostVerifier } from "../../exec/options/adapt-host-verifier.mjs";

const { utils } = ssh2;

export function prepareHostVerification({
  hostVerifier,
  host,
  port,
  knownHosts,
  knownHostsPath,
  hostCaPath,
  fsLib = fs,
  homedirFn = homedir,
  requireVerification = false,
  clientIsDefault = false,
}) {
  if (hostVerifier !== undefined && typeof hostVerifier !== "function")
    throw new Error("hostVerifier must be a function");
  if (
    clientIsDefault &&
    requireVerification &&
    !hostVerifier &&
    !knownHosts &&
    !knownHostsPath &&
    !hostCaPath
  )
    throw new Error("host verification configuration is required");
  return adaptHostVerifier(
    hostVerifier ||
      createHostVerifier({
        host,
        port,
        knownHosts,
        knownHostsPath,
        hostCaPath,
        fsLib,
        homedirFn,
        utils,
      }),
  );
}
