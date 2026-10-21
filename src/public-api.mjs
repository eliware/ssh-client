import { SshError as SshErrorImpl } from "./errors.mjs";
import { loadKey as loadKeyImpl } from "./keys/load-key.mjs";
import { expandHomePath as expandPathImpl } from "./paths/expand-home-path.mjs";
import { createHostVerifier as createHostVerifierImpl } from "./security/known-hosts/verification/verifier.mjs";
import { sshExec as sshExecImpl } from "./exec/runner/pipeline/execute.mjs";
import { connect as connectImpl } from "./connection/lifecycle/client/connect.mjs";
import { execOperationMetadata, logCommandResults } from "./logging/command.mjs";
import { operationMetadata, runLoggedOperation } from "./logging/operation.mjs";
import { singleTransfer } from "./operations/single-transfer.mjs";

export const SshError = SshErrorImpl;
export const loadKey = loadKeyImpl;
export const expandPath = expandPathImpl;
export const createHostVerifier = createHostVerifierImpl;
export function sshExec(options = {}) {
  const logger = options?.logger;
  const metadata = execOperationMetadata(options);
  return runLoggedOperation(
    logger,
    metadata,
    () => sshExecImpl(options),
    (results) => logCommandResults(logger, metadata, results),
  );
}

export function connect(options = {}) {
  const logger = options?.logger;
  const metadata = operationMetadata("connect", options);
  return runLoggedOperation(logger, metadata, () => connectImpl(options));
}

export function upload(options = {}) {
  return singleTransfer("upload", options);
}

export function download(options = {}) {
  return singleTransfer("download", options);
}
