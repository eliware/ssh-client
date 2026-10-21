export function createExecutionState() {
  return {
    get value() {
      return this.settled;
    },
    set value(value) {
      this.settled = value;
    },
    results: [],
    ended: false,
    commandStarting: false,
    closeDeferred: false,
    transportClosed: false,
    settled: false,
    readyHandled: false,
  };
}
