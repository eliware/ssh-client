export function attachTransferCancellation(signal, onCancel) {
  if (signal?.aborted) {
    onCancel();
    return;
  }
  signal?.addEventListener('abort', onCancel, { once: true });
}

export function detachTransferCancellation(signal, onCancel) {
  signal?.removeEventListener('abort', onCancel);
}
