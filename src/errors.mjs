export class SshError extends Error {
  constructor(message, code, cause, context = {}) { super(message, { cause }); this.name = 'SshError'; this.code = code; this.cause = cause; this.context = { operation: context.operation ?? 'unknown', phase: context.phase ?? 'unknown', ...context }; }
}
