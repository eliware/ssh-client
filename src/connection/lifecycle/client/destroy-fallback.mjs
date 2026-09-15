export function safelyDestroy(client) {
  try { client.destroy?.(); } catch {}
}

export function scheduleDestroyFallback(client, finish, delay = 1000) {
  return setTimeout(() => { safelyDestroy(client); finish(); }, delay);
}
