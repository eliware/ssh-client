# [![eliware.org](https://eliware.org/logos/brand.png)](https://discord.gg/M6aTR9eTwN)

## @eliware/ssh-client [![npm version](https://img.shields.io/npm/v/@eliware/ssh-client.svg)](https://www.npmjs.com/package/@eliware/ssh-client)[![license](https://img.shields.io/github/license/eliware/ssh-client.svg)](LICENSE)[![build status](https://github.com/eliware/ssh-client/actions/workflows/ci.yml/badge.svg)](https://github.com/eliware/ssh-client/actions)

> A simple, ESM-first SSH client for Node.js with key or password authentication and sequential command execution.

The implementation is organized into focused modules under `src/`; the root entry point remains the public compatibility barrel.

CI validates ordinary `main` pushes and pull requests; npm publishing remains restricted to `v*` tags.

Host certificate verification parses and verifies OpenSSH certificate wire data directly with `ssh2`; no external executable is required. It validates the CA signature, signing key, host principal, certificate type, validity interval, and revoked/negated host records. File transfers use SFTP (through `ssh2`), not the separate SCP protocol.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [ESM Example](#esm-example)
- [API](#api)
- [TypeScript](#typescript)
- [License](#license)

## Features

- Simple SSH command execution for Node.js
- Private-key and password authentication
- Sequential execution of multiple commands in a single SSH session
- Returns merged stdout/stderr and exit code for each command
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

## API

### sshExec(options)

Executes one or more commands on a remote SSH server using private-key or password authentication.

#### Parameters

- `host` (string): Hostname or IP address (required)
- `port` (number): SSH port (default: 22)
- `username` (string): SSH username (default: current user)
- `commands` (string[]): List of commands to execute (required)
- `privateKey` / `privateKeyPath` (string): Private-key credentials
- `password` (string): Password credential for bootstrap or password-authenticated servers
- `knownHosts` / `knownHostsPath` (string): OpenSSH known-host records
- `hostCaPath` (string): Trusted OpenSSH host CA public key

#### Returns

- `Promise<Array<{ command: string, stdout: string, stderr: string, result: string, code: number, signal?: string, duration: number }>>`: Resolves sequentially with separate output streams, merged output, exit status, and duration in milliseconds.

#### Throws

- If connection or authentication fails, or if required credentials are unavailable.

## Errors / Troubleshooting

`sshExec` validates the host, command list, and port before connecting. It throws `SshError` with codes for invalid options, missing keys, authentication failures, connection failures, connection timeouts, command failures, and command timeouts. Configure host verification with `hostVerifier` or `knownHosts`; do not weaken verification defaults in production.

`maxOutput` must be a positive number. `cwd` is restricted to a shell-safe cross-platform character set because it is applied through the remote shell; paths containing shell metacharacters are rejected. `commandTimeout` covers opening and executing each command channel and closes the SSH connection when it expires. An empty command list is a supported connectivity check and returns an empty array.

### connect(options)

Creates a reusable connection exposing `exec(commands)`, `shell({ onData, onInput })`, `upload(localPath, remotePath)`, `download(remotePath, localPath)`, and `close()`. Transfers use SFTP. Host certificates are verified against `@cert-authority` records or `hostCaPath`; certificate principals must include the requested host name or IP address.

## Development

```bash
npm test
npm run lint
npm run typecheck
npm run pack
```

For real-server integration coverage, provide `SSH_CLIENT_INTEGRATION_HOST`,
`SSH_CLIENT_INTEGRATION_USER`, and either `SSH_CLIENT_INTEGRATION_PRIVATE_KEY`
or `SSH_CLIENT_INTEGRATION_PASSWORD`, plus either
`SSH_CLIENT_INTEGRATION_KNOWN_HOSTS` or `SSH_CLIENT_INTEGRATION_CA`, then run
`SSH_CLIENT_INTEGRATION=1 npm test`. The integration test performs a real
connection, command, SFTP round-trip, and close; set
`SSH_CLIENT_INTEGRATION_REMOTE_PATH` when the server is Windows or otherwise
does not expose `/tmp`. It is skipped when these explicit test-only variables
are absent.

## Security

Treat private keys, passphrases, agents, host credentials, and command content as sensitive. Never commit keys or credentials. Prefer `knownHosts`/`hostVerifier`, limit command scope, and avoid logging command output containing secrets.

## TypeScript

Type definitions are included:

```ts
export interface SshExecOptions {
  host: string;
  port?: number;
  username?: string;
  commands: string[];
  privateKey?: string;
  privateKeyPath?: string;
  password?: string;
  knownHosts?: string;
  knownHostsPath?: string;
  hostCaPath?: string;
}

export interface SshExecResult {
  result: string;
  code: number;
}

export interface SshConnection {
  exec(commands: string[]): Promise<SshExecResult[]>;
  shell(options?: { onData?: (data: Buffer) => void; onInput?: (stream: any) => void }): Promise<any>;
  upload(localPath: string, remotePath: string): Promise<void>;
  download(remotePath: string, localPath: string): Promise<void>;
  close(): Promise<void>;
}

export declare function sshExec(options: SshExecOptions): Promise<SshExecResult[]>;
export declare function connect(options: Omit<SshExecOptions, 'commands'>): Promise<SshConnection>;
```

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
