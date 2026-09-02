import { SshError } from './errors.mjs';

function validate(config, operation, fields) {
  if (!config || typeof config !== 'object' || Array.isArray(config) || fields.some(field => typeof config[field] !== 'string' || !config[field])) throw new SshError(`${operation} requires an options object with localPath and remotePath`, 'SSH_INVALID_OPTIONS', undefined, { operation, phase: 'options' });
  if (config.mode !== undefined && (!Number.isInteger(config.mode) || config.mode < 0 || config.mode > 0o7777)) throw new SshError('upload mode must be a valid permission mask', 'SSH_INVALID_OPTIONS', undefined, { operation, phase: 'options' });
}

function transfer(client, config, operation, start) {
  const { signal, timeout = 0 } = config;
  if (!Number.isFinite(timeout) || timeout < 0) return Promise.reject(new SshError(`${operation} timeout must be non-negative`, 'SSH_INVALID_OPTIONS', undefined, { operation, phase: 'options' }));
  return new Promise((resolve, reject) => {
    let timer;
    let settled = false;
    let sftp;
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    };
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        sftp?.end?.();
      } catch (cause) {
        if (!error) error = new SshError(`${operation} session close failed`, 'SSH_SFTP', cause, { operation, phase: 'cleanup' });
      }
      if (!error) return resolve(result);
      if (error instanceof SshError) return reject(error);
      reject(new SshError(`${operation} failed: ${error.message || String(error)}`, 'SSH_TRANSFER', error, { operation, phase: 'transfer' }));
    };
    const cancel = () => {
      try {
        sftp?.end?.();
      } catch {}
      finish(new SshError(`${operation} cancelled`, 'SSH_CANCELLED', undefined, { operation, phase: 'transfer' }));
    };
    if (signal?.aborted) return cancel();
    signal?.addEventListener('abort', cancel, { once: true });
    if (timeout > 0) {
      timer = setTimeout(() => {
        try {
          sftp?.end?.();
        } catch {}
        finish(new SshError(`${operation} timed out`, 'SSH_TIMEOUT', undefined, { operation, phase: 'transfer' }));
      }, timeout);
    }
    try {
      client.sftp((error, handle) => {
        if (error || !handle) return finish(new SshError(`${operation} setup failed: ${error?.message || (error ? String(error) : 'missing SFTP handle')}`, 'SSH_SFTP', error, { operation, phase: 'setup' }));
        sftp = handle;
        try {
          start(sftp, finish);
        } catch (cause) {
          finish(cause);
        }
      });
    } catch (cause) {
      finish(new SshError(`${operation} setup failed: ${cause.message || String(cause)}`, 'SSH_SFTP', cause, { operation, phase: 'setup' }));
    }
  });
}

export function upload(client, config) {
  // codescope ignore: local path policy belongs to the caller; this library intentionally supports arbitrary configured transfer paths.
  try { validate(config, 'upload', ['localPath', 'remotePath']); } catch (error) { return Promise.reject(error); }
  return transfer(client, config, 'upload', (sftp, done) => sftp.fastPut(config.localPath, config.remotePath, { mode: config.mode ?? 0o600 }, done));
}

export function download(client, config) {
  // codescope ignore: local path policy belongs to the caller; this library intentionally supports arbitrary configured transfer paths.
  try { validate(config, 'download', ['remotePath', 'localPath']); } catch (error) { return Promise.reject(error); }
  return transfer(client, config, 'download', (sftp, done) => sftp.fastGet(config.remotePath, config.localPath, done));
}
