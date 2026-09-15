export function createConnectionState() {
  let state = 'open';
  return {
    get value() { return state; },
    set(value) { state = value; },
    isOpen() { return state === 'open'; },
  };
}
