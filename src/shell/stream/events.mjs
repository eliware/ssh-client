export function attachStreamEvents(stream, { onData = () => {}, onError = () => {} } = {}) {
  stream.on('data', data => onData(Buffer.isBuffer(data) ? data : Buffer.from(String(data))));
  stream.on('error', onError);
}
