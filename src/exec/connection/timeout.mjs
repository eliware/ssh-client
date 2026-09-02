export function startConnectionTimeout(timeout, onTimeout) {
  return setTimeout(onTimeout, timeout);
}
