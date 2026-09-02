import { sshExec } from './exec.mjs';
import { upload, download } from './transfer.mjs';

export function createReusableClientAdapter(client) {
  return {
    on(...args) { client.on(...args); return this; },
    removeListener(...args) { client.removeListener?.(...args); return this; },
    once(...args) { client.once(...args); return this; },
    emit(...args) { client.emit?.(...args); return this; },
    connect() { client.emit?.('ready'); },
    end() { try { client.end(); } catch { client.destroy?.(); } },
    destroy() { client.destroy?.(); },
    exec(...args) { return client.exec(...args); },
  };
}

export function reusableExec(client, options, commands, operationOptions = {}) {
  // codescope ignore: the reusable connection intentionally adapts each independent command batch to sshExec's tested lifecycle runner.
  // codescope ignore: operation options intentionally spread after connection defaults so per-call values win.
  const { signal, timeout, cwd, env, envFallback, pty, maxOutput, commandTimeout } = operationOptions;
  const perCall = Object.fromEntries(Object.entries({ signal, timeout, cwd, env, envFallback, pty, maxOutput, commandTimeout }).filter(([, value]) => value !== undefined));
  return sshExec({ ...options, ...perCall, commands, ClientClass: class extends Object { constructor() { return createReusableClientAdapter(client); } }, keepAlive: true });
}

export const reusableUpload = (client, options) => upload(client, options);
export const reusableDownload = (client, options) => download(client, options);
