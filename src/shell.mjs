import { SshError } from './errors.mjs';
import { validateShellTimeout } from './shell/validation.mjs';
import { attachShellStream } from './shell/stream.mjs';
import { createShellControl } from './shell/control.mjs';

export function openShell(client, { onData = () => {}, onInput, signal, timeout = 0 } = {}) {
  return new Promise((resolve, reject) => {
    try { validateShellTimeout(timeout); } catch (error) { return reject(error); }
    const control = createShellControl(client, signal, timeout, reject);
    if (!control.start()) return;
    let settled = false;
    const handle = (error, stream) => {
      if (settled || control.isSettled()) { stream?.close?.(); return; }
      control.stop();
      if (error) { settled = true; reject(new SshError(`SSH shell error: ${error.message || String(error)}`, 'SSH_SHELL', error, { operation: 'shell', phase: 'setup' })); return; }
      try { attachShellStream(stream, { onData, onInput, onError: cause => { if (!settled) { settled = true; reject(cause); } } }); } catch (cause) { settled = true; reject(cause); return; }
      settled = true;
      resolve(stream);
    };
    try { client.shell(handle); } catch (cause) { settled = true; control.stop(); reject(new SshError(`SSH shell error: ${cause.message || String(cause)}`, 'SSH_SHELL', cause, { operation: 'shell', phase: 'setup' })); }
  });
}
