import { quoteShell, withEnvironment } from '../../../environment.mjs';

export function buildCommand(command, { cwd, env, envFallback }) {
  const directory = cwd === undefined ? '' : `${envFallback === 'powershell' ? 'Set-Location' : envFallback === 'cmd' ? 'cd /d' : 'cd'} ${quoteShell(cwd, envFallback || 'posix')}`;
  return withEnvironment(cwd !== undefined ? `${directory} && ${command}` : command, env, envFallback);
}
