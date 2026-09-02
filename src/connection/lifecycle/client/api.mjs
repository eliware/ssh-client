import { SshError } from '../../../errors.mjs';
import { openShell } from '../../../shell.mjs';
import { reusableExec, reusableUpload, reusableDownload } from '../../../operations/reusable.mjs';
import { closeConnection } from './close.mjs';

export function createReusableClientApi(client, options) {
  let closePromise; let state = 'open'; let operationQueue = Promise.resolve();
  const serialize = operation => { const result = operationQueue.then(operation, operation); operationQueue = result.catch(() => {}); return result; };
  const unavailable = operation => Promise.reject(new SshError('connection is not open', 'SSH_CONNECTION', undefined, { operation, phase: 'state' }));
  return {
    get state() { return state; },
    exec: (commands, callOptions = {}) => state === 'open' ? serialize(() => reusableExec(client, options, commands, callOptions).catch(error => { if (error?.code === 'SSH_COMMAND_TIMEOUT') state = 'closed'; throw error; })) : unavailable('exec'),
    shell: shellOptions => state === 'open' ? openShell(client, shellOptions && typeof shellOptions === 'object' ? shellOptions : {}).catch(error => { if (error?.code === 'SSH_TIMEOUT' || error?.code === 'SSH_CANCELLED') state = 'closed'; throw error; }) : unavailable('shell'),
    upload: transferOptions => state === 'open' ? serialize(() => reusableUpload(client, transferOptions)) : unavailable('upload'),
    download: transferOptions => state === 'open' ? serialize(() => reusableDownload(client, transferOptions)) : unavailable('download'),
    close: () => closePromise ??= closeConnection(client, value => { state = value; }),
  };
}
