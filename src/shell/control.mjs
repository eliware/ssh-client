import { SshError } from '../errors.mjs';

export function createShellControl(client, signal, timeout, onCancel) {
  let timer; let settled = false;
  const abort = () => cancel('SSH_CANCELLED', 'SSH shell cancelled');
  const cancel = (code, message) => { if (settled) return; settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); try { client.end(); } catch {} onCancel(new SshError(message, code, undefined, { operation: 'shell', phase: 'setup' })); };
  const start = () => { if (signal?.aborted) { cancel('SSH_CANCELLED', 'SSH shell cancelled'); return false; } signal?.addEventListener('abort', abort, { once: true }); if (timeout > 0) timer = setTimeout(() => cancel('SSH_TIMEOUT', 'SSH shell timed out'), timeout); return true; };
  const stop = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
  return { start, stop, cancel, isSettled: () => settled, settle: () => { settled = true; stop(); } };
}
