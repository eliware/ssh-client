export function operationMetadata(operation, options = {}, details = {}) {
  return {
    operation,
    ...(typeof options?.host === "string" ? { host: options.host } : {}),
    port: options?.port ?? 22,
    ...details,
  };
}

export function logRecord(logger, level, message, metadata) {
  const write = logger?.[level];
  if (typeof write !== "function") return;
  try {
    write.call(logger, message, metadata);
  } catch {}
}

export async function runLoggedOperation(logger, metadata, action, onSuccess) {
  logRecord(logger, "debug", `${metadata.operation} started`, metadata);
  try {
    const result = await action();
    onSuccess?.(result, metadata);
    logRecord(logger, "info", `${metadata.operation} completed`, metadata);
    return result;
  } catch (error) {
    const failure = { ...metadata };
    if (typeof error?.name === "string") failure.errorName = error.name;
    if (typeof error?.code === "string") failure.errorCode = error.code;
    if (typeof error?.context?.phase === "string") failure.phase = error.context.phase;
    logRecord(logger, "error", `${metadata.operation} failed`, failure);
    throw error;
  }
}
