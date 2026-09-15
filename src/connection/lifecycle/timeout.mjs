export function startConnectionLifecycleTimeout(timeout, onTimeout) {
  return setTimeout(onTimeout, timeout);
}
