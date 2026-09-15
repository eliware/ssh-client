import { sshExec } from '../exec/runner/pipeline/execute.mjs';
import { upload } from '../transfer/upload.mjs';
import { download } from '../transfer/download.mjs';
import { createReusableClientAdapter } from '../connection/adapter/reusable.mjs';

export function reusableExec(client, options, commands, operationOptions = {}) {
  const { signal, timeout, cwd, env, envFallback, pty, maxOutput, commandTimeout } = operationOptions;
  const perCall = Object.fromEntries(Object.entries({ signal, timeout, cwd, env, envFallback, pty, maxOutput, commandTimeout }).filter(([, value]) => value !== undefined));
  return sshExec({ ...options, ...perCall, commands, ClientClass: class extends Object { constructor() { super(); return createReusableClientAdapter(client); } }, keepAlive: true });
}
export const reusableUpload = (client, options) => upload(createReusableClientAdapter(client), options);
export const reusableDownload = (client, options) => download(createReusableClientAdapter(client), options);
