import { SshError } from '../errors.mjs';
import { quotePowerShell } from './quote-powershell.mjs';
import { quotePosix } from './quote-posix.mjs';

export function renderEnvironment(command, env, mode) {
  if (!env) return command;
  const entries = Object.entries(env);
  if (!entries.every(([key, value]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'))) throw new SshError('env must contain shell-safe names and scalar values', 'SSH_INVALID_OPTIONS');
  if (!mode) return command;
  if (!['posix', 'powershell', 'cmd'].includes(mode)) throw new SshError('envFallback must be posix, powershell, or cmd', 'SSH_INVALID_OPTIONS');
  if (entries.length === 0) return command;
  if (mode === 'posix') return `${entries.map(([key, value]) => `export ${key}=${quotePosix(value)}`).join('; ')}; ${command}`;
  if (mode === 'powershell') return `${entries.map(([key, value]) => `$env:${key}=${quotePowerShell(value)}`).join('; ')}; ${command}`;
  if (entries.some(([, value]) => /[%!]/.test(String(value)))) throw new SshError('cmd environment values cannot contain expansion characters', 'SSH_INVALID_OPTIONS');
  return `${entries.map(([key, value]) => `set "${key}=${String(value).replaceAll('"', '""')}"`).join(' && ')} && ${command}`;
}
