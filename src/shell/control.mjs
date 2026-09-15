import { SshError } from '../errors.mjs';
import { attachShellCancellation } from './lifecycle/cancellation.mjs';
import { clearShellControl } from './lifecycle/cleanup.mjs';
import { startShellTimeout } from './lifecycle/timeout.mjs';

export function createShellControl(client, signal, timeout, onCancel) {
  let timer; let settled = false;
  const abort = () => cancel('SSH_CANCELLED', 'SSH shell cancelled');
  const cancel = (code, message) => { if (settled) return; settled = true; clearShellControl(timer, signal, abort); try { client.end(); } catch {} onCancel(new SshError(message, code, undefined, { operation: 'shell', phase: 'setup' })); };
  const start = () => { if (!attachShellCancellation(signal, abort)) return false; timer = startShellTimeout(timeout, () => cancel('SSH_TIMEOUT', 'SSH shell timed out')); return true; };
  const stop = () => clearShellControl(timer, signal, abort);
  return { start, stop, cancel, isSettled: () => settled, settle: () => { settled = true; stop(); } };
}
