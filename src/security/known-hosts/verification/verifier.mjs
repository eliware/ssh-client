import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { verifyCertificate } from "./certificate-verification.mjs";
import { readAuthorities } from "./records/load-authorities.mjs";
import { sameKey } from "./keys.mjs";
import { finishVerification } from "./callback.mjs";
import { evaluateRecords } from "./records/evaluate.mjs";
import { readHostText } from "./read-host-text.mjs";
import { normalizePresentedKey } from "./normalize-presented-key.mjs";

export function createHostVerifier({
  host,
  port = 22,
  knownHosts,
  knownHostsPath,
  hostCaPath,
  fsLib = fs,
  homedirFn = homedir,
  utils,
} = {}) {
  if (
    !host ||
    (!knownHosts && !knownHostsPath && !hostCaPath) ||
    typeof utils?.parseKey !== "function"
  )
    return () => false;
  const hosts = port === 22 ? [host] : [`[${host}]:${port}`];
  return (key, callback) => {
    const verification = (async () => {
      let accepted = false;
      try {
        const text = await readHostText({ knownHosts, knownHostsPath, fsLib, homedirFn });
        const { actual, certificate: cert } = normalizePresentedKey(key, utils);
        const records = evaluateRecords(text, hosts, actual, cert, utils);
        if (records.invalid || records.revoked.some((record) => sameKey(record, actual, utils)))
          return false;
        accepted = records.accepted;
        const fileAuthorities = hostCaPath
          ? await readAuthorities(hostCaPath, fsLib, homedirFn, utils)
          : [];
        if (!accepted && cert)
          accepted = [...records.authorities, ...fileAuthorities].some((ca) =>
            verifyCertificate(cert, ca, utils, hosts),
          );
      } catch {}
      return accepted;
    })();
    return finishVerification(verification, callback);
  };
}
