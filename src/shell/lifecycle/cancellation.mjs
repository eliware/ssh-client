export function attachShellCancellation(signal, onCancel) {
  if (signal?.aborted) {
    onCancel();
    return false;
  }
  signal?.addEventListener("abort", onCancel, { once: true });
  return true;
}
