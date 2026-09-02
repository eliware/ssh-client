import { SshError } from './errors.mjs';

export function openShell(client, { onData = () => {}, onInput, signal, timeout = 0 } = {}) {
  return new Promise((resolve, reject) => {
    if (!Number.isFinite(timeout) || timeout < 0) return reject(new SshError('shell timeout must be non-negative', 'SSH_INVALID_OPTIONS', undefined, { operation: 'shell', phase: 'options' }));
    let timer; let settled = false;
    const abort = () => cancel('SSH_CANCELLED', 'SSH shell cancelled');
    const cancel = (code, message) => { settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); try { client.end(); } catch {} reject(new SshError(message, code, undefined, { operation: 'shell', phase: 'setup' })); };
    if (signal?.aborted) return cancel('SSH_CANCELLED', 'SSH shell cancelled');
    signal?.addEventListener('abort', abort, { once: true });
    if (timeout > 0) timer = setTimeout(() => cancel('SSH_TIMEOUT', 'SSH shell timed out'), timeout);
    const handle = (error, stream) => {
      if (settled) { stream?.close?.(); return; }
      signal?.removeEventListener('abort', abort); clearTimeout(timer);
      if (error) { settled = true; reject(new SshError(`SSH shell error: ${error.message || String(error)}`, 'SSH_SHELL', error, { operation: 'shell', phase: 'setup' })); return; }
      const fail = cause => { if (!settled) { settled = true; reject(cause); } };
      const closeStream = stream.close?.bind(stream);
      stream.completion = typeof stream.once === 'function' ? new Promise((res, rej) => { let done = false; const complete = result => { if (done) return; done = true; res(result); }; stream.once('close', (code, signalValue) => complete({ code: code ?? null, signal: signalValue })); stream.once('end', () => complete({ code: null })); stream.once('error', error => { if (!done) { done = true; try { closeStream?.(); stream.end?.(); } catch {} rej(new SshError(`SSH shell error: ${error.message || String(error)}`, 'SSH_SHELL', error, { operation: 'shell', phase: 'stream' })); } }); }) : Promise.resolve({ code: null }); // codescope ignore: completion rejects post-setup stream errors through its dedicated error listener.
      stream.on('data', data => onData(Buffer.isBuffer(data) ? data : Buffer.from(String(data)))); stream.on('error', fail); // codescope ignore: post-setup shell stream error ownership and completion settlement are intentionally shared.
      // codescope ignore: completion owns post-setup close events; setup has already succeeded at this point.
      try { onInput?.(stream); } catch (cause) { stream.close?.(); settled = true; reject(new SshError(`SSH shell input error: ${cause.message || String(cause)}`, 'SSH_SHELL', cause, { operation: 'shell', phase: 'input' })); return; }
      settled = true;
      // codescope ignore: close is an explicit fire-and-forget transport operation; completion remains the awaitable lifecycle signal.
      stream.close = () => { try { closeStream?.(); stream.end?.(); } catch {} }; resolve(stream);
    };
    try { client.shell(handle); } catch (cause) { settled = true; signal?.removeEventListener('abort', abort); clearTimeout(timer); reject(new SshError(`SSH shell error: ${cause.message || String(cause)}`, 'SSH_SHELL', cause, { operation: 'shell', phase: 'setup' })); }
  });
}
