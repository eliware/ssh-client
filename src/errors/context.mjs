export function createErrorContext(context = {}) {
  return {
    ...context,
    operation: context.operation ?? "unknown",
    phase: context.phase ?? "unknown",
  };
}
