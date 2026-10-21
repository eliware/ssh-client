import { SshError as SshErrorImpl } from "./errors.mjs";
import { loadKey as loadKeyImpl } from "./keys/load-key.mjs";
import { expandHomePath as expandPathImpl } from "./paths/expand-home-path.mjs";
import { createHostVerifier as createHostVerifierImpl } from "./security/known-hosts/verification/verifier.mjs";
import { sshExec as sshExecImpl } from "./exec/runner/pipeline/execute.mjs";
import { connect as connectImpl } from "./connection/lifecycle/client/connect.mjs";
import { logCommandResults, operationMetadata, runLoggedOperation } from "./logging/operation.mjs";

export const SshError = SshErrorImpl;
export const loadKey = loadKeyImpl;
export const expandPath = expandPathImpl;
export const createHostVerifier = createHostVerifierImpl;
export function sshExec(options = {}) {
  const logger = options?.logger;
  const details = Array.isArray(options?.commands) ? { commandCount: options.commands.length } : {};
  const metadata = operationMetadata("exec", options, details);
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

async function singleTransfer(operation, options) {
  const config = options ?? {};
  const { logger, ...connectionOptions } = config;
  const metadata = operationMetadata(operation, config);
  return runLoggedOperation(logger, metadata, async () => {
    const connection = await connectImpl(connectionOptions);
    try {
      return await connection[operation](config);
    } finally {
      await connection.close();
    }
  });
}

export function upload(options = {}) {
  return singleTransfer("upload", options);
}

export function download(options = {}) {
  return singleTransfer("download", options);
}
