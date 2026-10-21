# Run commands

## Run commands with a short connection

Call `sshExec()` with a command array.
The client runs commands in order and returns one result for each command.
The client closes the connection after the last command.

```js
import { sshExec } from "@eliware/ssh-client";

const results = await sshExec({
  host: "router.example",
  username: "operator",
  privateKeyPath: "~/.ssh/id_ed25519",
  knownHostsPath: "~/.ssh/known_hosts",
  commands: ["show version", "show interfaces"],
  commandTimeout: 30_000,
});

for (const item of results) {
  console.log(item.command, item.code);
  console.log(item.stdout);
}
```

Use `connect().exec()` for commands on a long-lived connection.
Read [connections](connections.md) for a complete example.

## Set a command limit

Set `commandTimeout` in milliseconds.
The default is `0`, which sets no command time limit.
The `timeout` option is an alias for `commandTimeout` in `sshExec()` and `connect().exec()`.
Use `signal` to cancel before a command ends.

## Set the remote directory

Set `cwd` to a remote path.
The client uses shell quoting when it adds the path to the command.
The client rejects unsupported shell characters in `cwd`.
Set `envFallback` to match the remote shell when it is not a POSIX shell.

## Set environment values

Set `env` to an object with valid variable names and scalar values.
Use strings, numbers, or Booleans as values.
Set `envFallback` to `posix`, `powershell`, or `cmd` to add values to the command text.
Select a value that matches the remote shell.
Without `envFallback`, the client sends values through the SSH environment request.
The SSH server may reject that request.

The `cmd` fallback rejects values with `%` or `!` characters.

## Limit output

Set `maxOutput` to a positive byte count when you call `sshExec()`.
The default is `1000000` bytes for each command.
The client stores no more than this many combined output bytes for each command.
The client closes a command channel when output reaches the limit.
Check `truncated` before you use incomplete output.

## Read command results

Each result includes the command, standard output, standard error, combined output, exit code, signal, run time, and truncation flag.
Use `stdout` and `stderr` for separate output.
Use `result` for combined output in the order that the client receives it.
The `code` field is `null` when the server sends no exit code.

Read [API errors](api.md#errors) when a call rejects.
