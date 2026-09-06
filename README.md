# [![eliware.org](https://eliware.org/logos/brand.png)](https://discord.gg/M6aTR9eTwN)

Documentation: [docs](docs/README.md) · [specifications](specs/README.md) · [examples](examples/README.md)

## @eliware/ssh-client [![npm version](https://img.shields.io/npm/v/@eliware/ssh-client.svg)](https://www.npmjs.com/package/@eliware/ssh-client)[![license](https://img.shields.io/github/license/eliware/ssh-client.svg)](LICENSE)[![build status](https://github.com/eliware/ssh-client/actions/workflows/nodejs.yml/badge.svg)](https://github.com/eliware/ssh-client/actions)

> An ESM-first Node.js SSH client with secure host verification, reusable connections, command execution, interactive shells, and SFTP transfers.

The implementation is organized into focused modules under `src/`; the root entry point exposes the public API.

Host certificate verification parses and verifies OpenSSH certificate wire data when the transport exposes it; no external executable is required. It validates the CA signature, signing key, host principals, certificate type, validity interval, and revoked/negated host records. File transfers use SFTP (through `ssh2`), not the separate SCP protocol.

The package uses the Eliware-maintained `@eliware/ssh2` transport for
host-certificate algorithm negotiation.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [ESM Example](#esm-example)
  - [API](#api)
  - [connect](#connectoptions)
- [Errors / Troubleshooting](#errors--troubleshooting)
- [Development](#development)
- [TypeScript](#typescript)
- [License](#license)

## Features

- Simple SSH command execution for Node.js
- Private-key and password authentication
- Sequential execution of multiple commands in a single SSH session
- Reusable connections with explicit `open`, `closing`, and `closed` state
- Interactive shell sessions with completion and close semantics
- SFTP upload/download using options objects
- Per-operation timeouts and `AbortSignal` cancellation
- Structured `SshError` failures with operation and phase context
- Returns separate and merged output, truncation status, and nullable exit codes
- TypeScript type definitions included
- Fully ESM compatible
- Easily testable/mocked via dependency injection

## Requirements

- Node.js 26 or newer
- An SSH server and private-key or password authentication

## Installation

```bash
npm install @eliware/ssh-client
```

## Usage

### ESM Example

```js
import { sshExec } from '@eliware/ssh-client';

const results = await sshExec({
  host: 'your.ssh.server',
  username: 'youruser', // optional if same as local user
  knownHosts: 'your.ssh.server ssh-ed25519 BASE64_HOST_KEY',
  commands: [
    'echo Hello, SSH!',
    'uname -a',
  ],
});

for (const [i, { result, code }] of results.entries()) {
  console.log(`Command #${i + 1} exit code: ${code}`);
  console.log(result);
}
```

### Reusable connection

```js
import { connect } from '@eliware/ssh-client';

const ssh = await connect({
  host: 'your.ssh.server',
  username: 'youruser',
  privateKeyPath: process.env.SSH_PRIVATE_KEY_PATH,
  knownHostsPath: '~/.ssh/known_hosts',
  commandTimeout: 30_000,
});

try {
  await ssh.upload({ localPath: './config.boot', remotePath: '/tmp/config.boot', mode: 0o600 });
  const results = await ssh.exec(['show version'], { timeout: 15_000 });
  console.log(results[0].result);
} finally {
  await ssh.close();
}
```

## API

### sshExec(options)

Executes zero or more commands on a remote SSH server using private-key or password authentication.

#### Parameters

- `host` (string): Hostname or IP address (required)
- `port` (number): SSH port (default: 22)
- `username` (string): SSH username (default: `USER` on POSIX, otherwise `USERNAME`; explicit `username` always wins)
- `commands` (string[]): List of commands to execute (required; may be empty for a connectivity check, subject to normal authentication and host verification)
- Commands are passed to the remote shell as command text; do not include untrusted input unless it has been safely escaped for the target shell.
- `privateKey` / `privateKeyPath` (string): Private-key credential or path; provide this, `password`, or `agent` as the authentication source
- `password` (string): Password credential for password-authenticated servers; useful for bootstrap workflows that later switch to key authentication. If password and agent are both supplied, ssh2 receives both and the server selects the method.
- `knownHosts` / `knownHostsPath` (string): OpenSSH known-host records
- `hostCaPath` (string): Trusted OpenSSH host CA public key
- `hostVerifier` (function): Custom verifier receiving the presented key as a `Buffer`; it may return a boolean/Promise or invoke `(accepted: boolean)` once asynchronously. Verification fails closed when it throws, rejects, returns `false`, or never accepts the key.
- `connectTimeout` / `commandTimeout` (number): Connection and command timeouts in milliseconds
- `timeout` (number): Per-call command-timeout override in milliseconds
- `signal` (AbortSignal): Cancels the connection or command operation
- `maxOutput` (number): Maximum combined output bytes per command
- `cwd` (string): Safe remote working directory; the remote server must interpret the generated `cd` command under its configured shell
- `env` (object): Remote environment values; without `envFallback`, SSH requests them from the server. With `envFallback`, values are rendered into the command and the option also selects the `cwd` shell syntax (`posix`, `powershell`, or `cmd`). The caller must select syntax matching the server's configured login shell; this option does not change that shell.
- `pty` (boolean): Request a pseudo-terminal for exec commands. Use `connect().shell()` for interactive SSH shells.
- `keepAlive` (boolean): Keep the underlying SSH transport open after execution; reusable connections use this internally
- Reusable `exec(commands, options)` accepts per-operation execution options (`timeout`, `signal`, `cwd`, `env`, `envFallback`, `pty`, and `commandTimeout`); connection-level values are used when omitted. Use `shell()` for interactive sessions.
- `agent` (string): optional SSH agent socket/path used for authentication
- `passphrase` (string): optional passphrase used to unlock `privateKey` or `privateKeyPath`

#### Returns

- `Promise<Array<{ command: string, stdout: string, stderr: string, result: string, truncated: boolean, code: number | null, signal?: string, duration: number }>>`: Resolves sequentially with separate output streams, merged output, truncation status, exit status (which may be `null` when no status is supplied), and duration in milliseconds. `signal` is present only when the process exits by signal.

When multiple authentication settings are supplied, an explicit private key is preferred; `privateKeyPath` always loads that path, while an explicitly supplied password or agent suppresses only default key discovery. Host verification remains fail-closed: provide `hostVerifier`, `knownHosts`, `knownHostsPath`, or `hostCaPath`. A custom `hostVerifier` receives `(key, callback)`, must invoke the callback at most once asynchronously when it does not return a boolean/promise, and any thrown error, rejection, or `false` result fails closed. An explicit custom verifier takes precedence over file-based options.

#### Throws

- If connection, authentication, shell, SFTP, or reusable-connection lifecycle operations fail, or if required credentials are unavailable.

## Errors / Troubleshooting

`sshExec` validates the host, command list, and port before connecting. Pass an `AbortSignal` through `signal` to cancel connection or command execution; `timeout` overrides the command timeout for that invocation. It throws `SshError` with codes for invalid options, missing keys, authentication failures, connection failures, connection timeouts, command failures, and command timeouts. Configure host verification with `hostVerifier`, `knownHosts`, `knownHostsPath`, or `hostCaPath`; the default verifier fails closed when none is provided.

`maxOutput` must be a positive number. `cwd` is restricted to a shell-safe cross-platform character set because it is applied through the remote shell; paths containing shell metacharacters are rejected. `commandTimeout` covers opening and executing each command channel and closes the SSH connection when it expires. An empty command list is a supported connectivity check and returns an empty array.

`sshExec` is command-based; use `connect().shell()` to open an interactive shell on a reusable connection and provide data/input handlers. Reusable `exec()` inherits the options supplied to `connect()`. With `envFallback`, variables are rendered into the remote command using the selected shell syntax; they are not also sent through SSH's environment request. Ensure the selected syntax matches the remote login shell.

### connect(options)

Creates a reusable connection exposing `exec(commands, options?)`, `shell({ onData, onInput, timeout, signal })`, `upload({ localPath, remotePath, mode, timeout, signal })`, `download({ remotePath, localPath, timeout, signal })`, and `close()`. Transfers use SFTP. Shell sessions expose `close()` and a `completion` promise. The connection exposes `state` as `open`, `closing`, or `closed`; operation failures include structured context. `connect()` accepts the same connection options above except `commands`; TypeScript expresses this as `Omit<SshExecOptions, 'commands'>`, with commands supplied later to `exec()`. Authentication may use an explicit key, password, agent, or default key discovery, and lifecycle failures are reported through the returned operation promises. Host keys can be verified with a custom verifier, known-host records, or a trusted host CA; certificate principals must include the requested host name or IP address.

### createHostVerifier(options)

Creates a reusable host verifier from `host`, `port`, known-host records or path, and an optional trusted host CA path. Pass the returned verifier as `hostVerifier` when configuring `sshExec()` or `connect()`. Verification is fail-closed and supports exact, wildcard, negated, hashed, revoked, and `@cert-authority` known-host entries.

## Development

```bash
npm test
npm run lint
npm run typecheck
npm audit --omit=dev --audit-level=moderate
```

For real-server integration coverage, provide `SSH_CLIENT_INTEGRATION_HOST`,
`SSH_CLIENT_INTEGRATION_USER`, and either `SSH_CLIENT_INTEGRATION_PRIVATE_KEY`
or `SSH_CLIENT_INTEGRATION_PASSWORD`, plus either
`SSH_CLIENT_INTEGRATION_KNOWN_HOSTS` or `SSH_CLIENT_INTEGRATION_CA`, then run
`SSH_CLIENT_INTEGRATION=1 npm test`. The integration test performs a real
connection, command, SFTP round-trip, and close; set
`SSH_CLIENT_INTEGRATION_PORT` for a non-default disposable server and set
`SSH_CLIENT_INTEGRATION_REMOTE_PATH` when the server is Windows or otherwise
does not expose `/tmp`. It is skipped when these explicit test-only variables
are absent.

Set `SSH_CLIENT_INTEGRATION_CERT` to the advertised certificate file as well
to enable the direct signature-tampering and revocation regression checks.

## Security

Treat private keys, passphrases, agents, host credentials, and command content as sensitive. Never commit keys or credentials. Prefer `knownHosts`/`hostVerifier`, limit command scope, and avoid logging command output containing secrets.

## TypeScript

Type definitions are included:

```ts
export interface SshExecOptions {
  host: string;
  port?: number;
  username?: string;
  commands: string[]; // Required; an empty array is valid when authentication and host verification are configured.
  privateKey?: string;
  privateKeyPath?: string;
  password?: string;
  knownHosts?: string;
  knownHostsPath?: string;
  hostCaPath?: string;
  hostVerifier?: (key: Buffer, callback?: (accepted: boolean) => void) => boolean | Promise<boolean> | void;
  connectTimeout?: number;
  commandTimeout?: number;
  timeout?: number;
  signal?: AbortSignal;
  maxOutput?: number;
  cwd?: string;
  env?: Record<string, string | number | boolean>;
  envFallback?: 'posix' | 'powershell' | 'cmd';
  pty?: boolean;
  agent?: string;
  passphrase?: string;
  keepAlive?: boolean;
}

export interface SshExecResult {
  command: string;
  stdout: string;
  stderr: string;
  result: string;
  truncated: boolean;
  code: number | null;
  signal?: string;
  duration: number;
}

export interface UploadOptions { localPath: string; remotePath: string; mode?: number; timeout?: number; signal?: AbortSignal; }
export interface DownloadOptions { remotePath: string; localPath: string; timeout?: number; signal?: AbortSignal; }

export interface ShellSession extends NodeJS.ReadWriteStream {
  close(): void;
  completion: Promise<{ code: number | null; signal?: string }>;
}

export interface SshConnection {
  readonly state: 'open' | 'closing' | 'closed';
  exec(commands: string[], options?: { signal?: AbortSignal; timeout?: number; commandTimeout?: number; cwd?: string; env?: Record<string, string | number | boolean>; envFallback?: 'posix' | 'powershell' | 'cmd'; pty?: boolean }): Promise<SshExecResult[]>;
  shell(options?: { onData?: (data: Buffer) => void; onInput?: (stream: ShellSession) => void; timeout?: number; signal?: AbortSignal }): Promise<ShellSession>;
  upload(options: UploadOptions): Promise<void>;
  download(options: DownloadOptions): Promise<void>;
  close(): Promise<void>; // Force-destroys the transport after the close grace period.
}

export declare function sshExec(options: SshExecOptions): Promise<SshExecResult[]>;
export declare function connect(options: Omit<SshExecOptions, 'commands'>): Promise<SshConnection>;

export declare class SshError extends Error {
  code: string;
  cause?: unknown;
  context: { operation: string; phase: string; [key: string]: unknown };
}
```

### Remote environment fallback

Pass `env` to request SSH environment variables. If the target SSH daemon does not accept `AcceptEnv`, also set `envFallback` to `posix`, `powershell`, or `cmd`; the library safely initializes those variables in the remote shell. When `cwd` is supplied, `envFallback` also selects the corresponding remote shell command syntax.

## Support

For help, questions, or to chat with the author and community, visit:

[![Discord](https://eliware.org/logos/discord_96.png)](https://discord.gg/M6aTR9eTwN)[![eliware.org](https://eliware.org/logos/eliware_96.png)](https://discord.gg/M6aTR9eTwN)

**[eliware.org on Discord](https://discord.gg/M6aTR9eTwN)**

## License

[MIT © 2025 Eli Sterling, eliware.org](LICENSE)

## Links

- [Home Page](https://eliware.org)
- [GitHub](https://github.com/eliware/ssh-client)
- [npm](https://www.npmjs.com/package/@eliware/ssh-client)
- [Discord](https://discord.gg/M6aTR9eTwN)
