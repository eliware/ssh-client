export class SshError extends Error {
  constructor(message, code, cause) { super(message, { cause }); this.name = 'SshError'; this.code = code; }
}
