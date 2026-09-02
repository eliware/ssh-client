import { SshError } from '../errors.mjs';

export function validateConnectionOptions(options, Client, connectTimeout) {
  if (!options.host) throw new SshError('host is required', 'SSH_INVALID_OPTIONS');
  if (options.hostVerifier !== undefined && typeof options.hostVerifier !== 'function') throw new SshError('hostVerifier must be a function', 'SSH_INVALID_OPTIONS');
  const port = options.port ?? 22;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new SshError('port must be valid', 'SSH_INVALID_OPTIONS');
  if (!Number.isFinite(connectTimeout) || connectTimeout <= 0) throw new SshError('connectTimeout must be positive', 'SSH_INVALID_OPTIONS');
  if (options.ClientClass === Client && !options.hostVerifier && !options.knownHosts && !options.knownHostsPath && !options.hostCaPath) throw new SshError('host verification configuration is required', 'SSH_INVALID_OPTIONS');
}
