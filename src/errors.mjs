import { createErrorContext } from "./errors/context.mjs";

export class SshError extends Error {
  constructor(message, code, cause, context = {}) {
    super(message, { cause });
    this.name = "SshError";
    this.code = code;
    this.cause = cause;
    this.context = createErrorContext(context);
  }
}
