export function invokeUpload(sftp, config, done) {
  sftp.fastPut(config.localPath, config.remotePath, { mode: config.mode ?? 0o600 }, done);
}
