import { SshError } from '../errors.mjs';

export function attachShellStream(stream, { onData = () => {}, onInput, onError = () => {} } = {}) {
  const closeStream = stream.close?.bind(stream);
  stream.completion = typeof stream.once === 'function' ? new Promise((resolve, reject) => {
    let done = false; const complete = result => { if (done) return; done = true; resolve(result); };
    stream.once('close', (code, signal) => complete({ code: code ?? null, signal }));
    stream.once('end', () => complete({ code: null }));
    stream.once('error', error => { if (!done) { done = true; try { closeStream?.(); stream.end?.(); } catch {} reject(new SshError(`SSH shell error: ${error.message || String(error)}`, 'SSH_SHELL', error, { operation: 'shell', phase: 'stream' })); } });
  }) : Promise.resolve({ code: null });
  stream.on('data', data => onData(Buffer.isBuffer(data) ? data : Buffer.from(String(data))));
  stream.on('error', onError);
  try { onInput?.(stream); } catch (cause) { stream.close?.(); throw new SshError(`SSH shell input error: ${cause.message || String(cause)}`, 'SSH_SHELL', cause, { operation: 'shell', phase: 'input' }); }
  stream.close = () => { try { closeStream?.(); stream.end?.(); } catch {} };
  return stream;
}
