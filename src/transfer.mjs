import { SshError } from './errors.mjs';

function finish(sftp, callback, resolve, reject) {
  let closeError;
  try { sftp.end?.(); } catch (error) { closeError = error; }
  // Intentional: SFTP callbacks are not guaranteed to provide Error objects, so retain their string detail.
  if (callback) reject(new SshError(`SFTP transfer failed: ${callback?.message || String(callback)}`, 'SSH_TRANSFER', callback));
  else if (closeError) reject(new SshError(`SFTP close error: ${closeError.message}`, 'SSH_SFTP', closeError));
  else resolve();
}

export function upload(client, localPath, remotePath, mode = 0o600) {
  // Intentional: Promise executors convert synchronous client.sftp throws into rejected Promises.
  return new Promise((resolve, reject) => { try { client.sftp((error, sftp) => {
    if (error) { try { sftp?.end?.(); } catch {} reject(new SshError(`SFTP setup failed: ${error.message}`, 'SSH_SFTP', error)); return; }
    let complete = false;
    /* istanbul ignore next -- ssh2 invokes each SFTP completion callback once. */
    const done = result => { if (complete) return; complete = true; finish(sftp, result, resolve, reject); };
    try { sftp.fastPut(localPath, remotePath, { mode }, done); }
    catch (cause) { complete = true; finish(sftp, cause, resolve, reject); }
  }); } /* istanbul ignore next -- transport client normally reports setup failures via callback. */ catch (cause) { reject(new SshError(`SFTP setup failed: ${cause.message}`, 'SSH_SFTP', cause)); } });
}

export function download(client, remotePath, localPath) {
  return new Promise((resolve, reject) => { try { client.sftp((error, sftp) => {
    if (error) { try { sftp?.end?.(); } catch {} reject(new SshError(`SFTP setup failed: ${error.message}`, 'SSH_SFTP', error)); return; }
    let complete = false;
    /* istanbul ignore next -- ssh2 invokes each SFTP completion callback once. */
    const done = result => { if (complete) return; complete = true; finish(sftp, result, resolve, reject); };
    try { sftp.fastGet(remotePath, localPath, done); }
    catch (cause) { complete = true; finish(sftp, cause, resolve, reject); }
  }); } /* istanbul ignore next -- transport client normally reports setup failures via callback. */ catch (cause) { reject(new SshError(`SFTP setup failed: ${cause.message}`, 'SSH_SFTP', cause)); } });
}
