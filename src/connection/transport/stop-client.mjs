export function stopClient(client) {
  try {
    client.end();
  } catch {
    client.destroy?.();
  }
}
