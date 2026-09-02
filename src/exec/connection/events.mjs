export function attachConnectionEvents(client, { onReady, onError, onClosed }) {
  client.on('ready', onReady)
    .on('error', onError)
    .on('end', onClosed)
    .on('close', onClosed);
  return client;
}
