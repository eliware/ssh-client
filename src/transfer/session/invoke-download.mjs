export function invokeDownload(sftp, config, done) {
  sftp.fastGet(config.remotePath, config.localPath, done);
}
