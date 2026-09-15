export function startShellTimeout(timeout, onTimeout) {
  return timeout > 0 ? setTimeout(onTimeout, timeout) : undefined;
}
