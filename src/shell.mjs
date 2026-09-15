import { validateShellTimeout } from './shell/validation.mjs';
import { attachShellStream } from './shell/stream.mjs';
import { createShellControl } from './shell/control.mjs';
import { completeShellSetup } from './shell/completion.mjs';
import { requestShell } from './shell/request.mjs';

export function openShell(client, { onData = () => {}, onInput, signal, timeout = 0 } = {}) {
  return new Promise((resolve, reject) => {
    try { validateShellTimeout(timeout); } catch (error) { return reject(error); }
    const control = createShellControl(client, signal, timeout, reject);
    if (!control.start()) return;
    let settled = false;
    const handle = (error, stream) => {
      if (settled || control.isSettled()) { stream?.close?.(); return; }
      const completed = completeShellSetup({ error, stream, settled: () => settled, stop: control.stop, attach: value => attachShellStream(value, { onData, onInput, onError: cause => { if (!settled) { settled = true; reject(cause); } } }), resolve: value => { settled = true; control.settle(); resolve(value); }, reject: cause => { settled = true; reject(cause); } });
      return completed;
    };
    requestShell(client, handle, error => { settled = true; control.stop(); reject(error); });
  });
}
