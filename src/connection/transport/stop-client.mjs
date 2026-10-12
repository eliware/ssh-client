export function stopClient(client) {
  try {
    client.end();
  } catch {
    try {
      client.destroy?.();
    } catch {}
  }
}
