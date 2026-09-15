import { SshError } from '../../errors.mjs';
export function attachStreamInput(stream, onInput) {
  try { onInput?.(stream); } catch (cause) { stream.close?.(); throw new SshError(`SSH shell input error: ${cause.message || String(cause)}`, 'SSH_SHELL', cause, { operation: 'shell', phase: 'input' }); }
}
