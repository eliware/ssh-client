export function startTransferTimeout(timeout, onTimeout) {
  return timeout > 0 ? setTimeout(onTimeout, timeout) : undefined;
}
