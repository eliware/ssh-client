export function invokeCommand(client, command, { env, envFallback, pty }, done) {
  if (envFallback) return client.exec(command, { pty }, done);
  if (env !== undefined) return client.exec(command, { env, pty }, done);
  if (pty) return client.exec(command, { pty }, done);
  return client.exec(command, done);
}
