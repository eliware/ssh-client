import { logRecord, operationMetadata } from "./operation.mjs";

export function execOperationMetadata(options = {}) {
  const details = Array.isArray(options?.commands) ? { commandCount: options.commands.length } : {};
  return operationMetadata("exec", options, details);
}

export function logCommandResults(logger, metadata, results) {
  if (!Array.isArray(results)) return;
  results.forEach((result, index) => {
    const succeeded = result.code === 0;
    logRecord(
      logger,
      succeeded ? "http" : "warn",
      succeeded ? "SSH command completed" : "SSH command returned a nonzero exit code",
      {
        ...metadata,
        commandIndex: index + 1,
        exitCode: result.code,
        duration: result.duration,
      },
    );
  });
}
