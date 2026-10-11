export function clearShellControl(timer, signal, abort) {
  clearTimeout(timer);
  signal?.removeEventListener("abort", abort);
}
