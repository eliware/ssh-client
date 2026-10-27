import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import ssh2 from "@eliware/ssh2";
import { createHostVerifier } from "../../security/known-hosts/verification/verifier.mjs";
import { adaptHostVerifier } from "../../exec/options/adapt-host-verifier.mjs";
import { validateHostVerificationPolicy } from "./verification-policy.mjs";

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
  validateHostVerificationPolicy({
    hostVerifier,
    knownHosts,
    knownHostsPath,
    hostCaPath,
    requireVerification,
    clientIsDefault,
  });
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
