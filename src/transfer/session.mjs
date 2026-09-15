import { acquireSftp } from './session/acquire-sftp.mjs';
import { closeSftp } from './session/cleanup.mjs';
import { attachTransferCancellation, detachTransferCancellation } from './session/cancellation.mjs';
import { cancellationError, normalizeTransferError, timeoutError, transferSetupError } from './session/errors.mjs';
import { startTransferTimeout } from './session/timeout.mjs';
import { settleTransfer } from './session/settlement.mjs';

export function runTransfer(client, config, operation, start) {
  const { signal, timeout = 0 } = config;
  return new Promise((resolve, reject) => {
    let timer; let settled = false; let sftp;
    const cleanup = () => { clearTimeout(timer); detachTransferCancellation(signal, cancel); };
    const state = { get settled() { return settled; }, set settled(value) { settled = value; } };
    const finish = (error, result) => settleTransfer({ state, cleanup, sftp, operation, error, result, closeSftp, normalizeTransferError, resolve, reject });
    const cancel = () => { closeSftp(sftp); finish(cancellationError(operation)); };
    attachTransferCancellation(signal, cancel); if (signal?.aborted) return;
    timer = startTransferTimeout(timeout, () => { closeSftp(sftp); finish(timeoutError(operation)); });
    acquireSftp(client, (error, handle) => { if (settled) { closeSftp(handle); return; } if (error || !handle) return finish(transferSetupError(operation, error, handle)); sftp = handle; try { start(sftp, finish); } catch (cause) { finish(cause); } });
  });
}
