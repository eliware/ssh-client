import { attachTransferCancellation, detachTransferCancellation } from "./cancellation.mjs";
import { cancellationError, normalizeTransferError, timeoutError } from "./errors.mjs";
import { startTransferTimeout } from "./timeout.mjs";
import { settleTransfer } from "./settlement.mjs";
import { closeSftp } from "./cleanup.mjs";

export function createTransferControl({ signal, timeout, operation, resolve, reject }) {
  let timer;
  let settled = false;
  let sftp;
  const cleanup = () => {
    clearTimeout(timer);
    detachTransferCancellation(signal, cancel);
  };
  const state = {
    get settled() {
      return settled;
    },
    set settled(value) {
      settled = value;
    },
  };
  const finish = (error, result) =>
    settleTransfer({
      state,
      cleanup,
      sftp,
      operation,
      error,
      result,
      closeSftp,
      normalizeTransferError,
      resolve,
      reject,
    });
  const cancel = () => finish(cancellationError(operation));
  attachTransferCancellation(signal, cancel);
  if (!signal?.aborted)
    timer = startTransferTimeout(timeout, () => finish(timeoutError(operation)));
  return {
    finish,
    isSettled: () => settled,
    setSftp: (handle) => {
      sftp = handle;
    },
  };
}
