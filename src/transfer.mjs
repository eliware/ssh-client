import { validateTransferOptions } from './transfer/validation.mjs';
import { runTransfer } from './transfer/session.mjs';

export function upload(client, config) {
  try { validateTransferOptions(config, 'upload', ['localPath', 'remotePath']); } catch (error) { return Promise.reject(error); }
  return runTransfer(client, config, 'upload', (sftp, done) => sftp.fastPut(config.localPath, config.remotePath, { mode: config.mode ?? 0o600 }, done));
}

export function download(client, config) {
  try { validateTransferOptions(config, 'download', ['remotePath', 'localPath']); } catch (error) { return Promise.reject(error); }
  return runTransfer(client, config, 'download', (sftp, done) => sftp.fastGet(config.remotePath, config.localPath, done));
}
