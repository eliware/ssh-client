import { SshError } from './errors.mjs';

function finish(sftp, callback, resolve, reject) {
  try { sftp.end?.(); } catch (error) { reject(new SshError(`SFTP close error: ${error.message}`, 'SSH_SFTP', error)); return; }
  if (callback) reject(new SshError(`SFTP transfer failed: ${callback.message}`, 'SSH_TRANSFER', callback));
  else resolve();
}

export function upload(client, localPath, remotePath, mode = 0o600) {
  return new Promise((resolve, reject) => client.sftp((error, sftp) => {
    if (error) { reject(new SshError(`SFTP setup failed: ${error.message}`, 'SSH_SFTP', error)); return; }
    sftp.fastPut(localPath, remotePath, { mode }, result => finish(sftp, result, resolve, reject));
  }));
}

export function download(client, remotePath, localPath) {
  return new Promise((resolve, reject) => client.sftp((error, sftp) => {
    if (error) { reject(new SshError(`SFTP setup failed: ${error.message}`, 'SSH_SFTP', error)); return; }
    sftp.fastGet(remotePath, localPath, result => finish(sftp, result, resolve, reject));
  }));
}
