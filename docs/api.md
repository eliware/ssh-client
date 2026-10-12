# API and options

Import public names from `@eliware/ssh-client`.
The declarations in `src/public-api.d.ts` define the TypeScript API.

## Public functions

| Function                      | Purpose                                                     |
| ----------------------------- | ----------------------------------------------------------- |
| `sshExec(options)`            | Open a connection, run commands, then close the connection. |
| `connect(options)`            | Open a reusable connection.                                 |
| `createHostVerifier(options)` | Create a verifier for host keys and host certificates.      |
| `loadKey(options)`            | Read a private key from the configured source.              |
| `expandPath(path)`            | Expand a leading `~` to the home directory.                 |
| `upload(options)`             | Upload a file through SFTP.                                 |
| `download(options)`           | Download a file through SFTP.                               |
| `SshError`                    | Error class with a code, cause, and context.                |

`connect()` returns an object with `state`, `exec`, `shell`, `upload`, `download`, and `close`.
Read the [connection guide](connections.md) for connection use.

## Connection options

| Option           | Meaning                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| `host`           | Required SSH host name or IP address.                                         |
| `port`           | SSH port. Default: `22`.                                                      |
| `username`       | SSH account name. Default: `USER` or `USERNAME` from the process environment. |
| `privateKey`     | Private key text.                                                             |
| `privateKeyPath` | Path to a private key file.                                                   |
| `passphrase`     | Passphrase for an encrypted private key.                                      |
| `password`       | SSH account password.                                                         |
| `agent`          | SSH agent socket path.                                                        |
| `connectTimeout` | Connection and authentication limit in milliseconds. Default: `10000`.        |
| `hostVerifier`   | Custom host-key verifier function.                                            |
| `knownHosts`     | OpenSSH known-host records as text.                                           |
| `knownHostsPath` | Path to an OpenSSH known-host file.                                           |
| `hostCaPath`     | Path to a file with trusted host CA public keys.                              |
| `ClientClass`    | Custom SSH client class.                                                      |
| `fsLib`          | Custom file-system API for key and host files.                                |
| `homedirFn`      | Custom function that returns the home directory.                              |

Set at least one host verification option when you use the default SSH client.
Read [authentication and connections](connections.md) and [host verification](security.md).

`createHostVerifier()` accepts `host`, `port`, `knownHosts`, `knownHostsPath`, and `hostCaPath`.
Set `host` and at least one trusted record or CA source.

## Command options

| Option           | Meaning                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `commands`       | Required array of command strings for `sshExec`.                     |
| `commandTimeout` | Per-command limit in milliseconds. Default: `0`, with no limit.      |
| `timeout`        | Alias for `commandTimeout` in `sshExec`.                             |
| `signal`         | `AbortSignal` for cancellation.                                      |
| `maxOutput`      | Maximum combined output bytes for each command. Default: `1000000`.  |
| `cwd`            | Remote directory for the command.                                    |
| `env`            | Environment variable names and string, number, or Boolean values.    |
| `envFallback`    | Shell method for environment setup: `posix`, `powershell`, or `cmd`. |
| `pty`            | Request a pseudo-terminal for a command. Default: `false`.           |
| `keepAlive`      | Keep the SSH transport open after `sshExec`. Default: `false`.       |

`connect().exec(commands, options)` accepts command timeout, timeout, signal, cwd, env, envFallback, and pty.
Read the [command guide](commands.md) for behavior and result fields.
Use `connect()` for a reusable connection. It returns the handle that closes the transport.
Do not set `keepAlive` with `sshExec`.
That function does not return a connection handle.

## Transfer options

| Option       | Meaning                                                      |
| ------------ | ------------------------------------------------------------ |
| `localPath`  | Required local file path.                                    |
| `remotePath` | Required remote file path.                                   |
| `mode`       | Optional upload permission mask from `0` to `0o7777`.        |
| `timeout`    | Transfer limit in milliseconds. Default: `0`, with no limit. |
| `signal`     | `AbortSignal` for cancellation.                              |

Read the [file transfer guide](transfers.md) for examples.

## Shell options

| Option    | Meaning                                                         |
| --------- | --------------------------------------------------------------- |
| `onData`  | Callback for shell output. The callback receives a `Buffer`.    |
| `onInput` | Callback with the shell stream for input.                       |
| `signal`  | `AbortSignal` for shell setup cancellation.                     |
| `timeout` | Shell setup limit in milliseconds. Default: `0`, with no limit. |
| `term`    | Pseudo-terminal type.                                           |
| `cols`    | Positive pseudo-terminal column count.                          |
| `rows`    | Positive pseudo-terminal row count.                             |

Read the [shell guide](shell.md) for input, output, and completion.

## Results

Each command result has `command`, `stdout`, `stderr`, `result`, `truncated`, `code`, `signal`, and `duration` fields.
`result` contains the combined output.
`code` is the remote exit code, or `null` when the server sends no code.
`duration` is the command time in milliseconds.
`truncated` is `true` when output reached `maxOutput`.

## Errors

Errors use the `SshError` class.
Each error has a `code`, a `cause`, and a `context` object.

| Code                  | Meaning                                              |
| --------------------- | ---------------------------------------------------- |
| `SSH_INVALID_OPTIONS` | Set each required option to a valid value.           |
| `SSH_KEY_NOT_FOUND`   | The client did not find a private key.               |
| `SSH_AUTHENTICATION`  | The server rejected authentication.                  |
| `SSH_TIMEOUT`         | The connection or operation exceeded its time limit. |
| `SSH_COMMAND_TIMEOUT` | A command exceeded its time limit.                   |
| `SSH_CANCELLED`       | An abort signal cancelled the operation.             |
| `SSH_CONNECTION`      | The SSH transport stopped or returned an error.      |
| `SSH_EXEC`            | Command setup or execution failed.                   |
| `SSH_SHELL`           | Shell setup or stream use failed.                    |
| `SSH_SFTP`            | SFTP setup or cleanup failed.                        |
| `SSH_TRANSFER`        | A file transfer failed.                              |

Read [troubleshooting](troubleshooting.md) for next steps.
