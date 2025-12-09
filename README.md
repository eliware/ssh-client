# [![eliware.org](https://eliware.org/logos/brand.png)](https://discord.gg/M6aTR9eTwN)

## @eliware/ssh-client [![npm version](https://img.shields.io/npm/v/@eliware/ssh-client.svg)](https://www.npmjs.com/package/@eliware/ssh-client)[![license](https://img.shields.io/github/license/eliware/ssh-client.svg)](LICENSE)[![build status](https://github.com/eliware/ssh-client/actions/workflows/nodejs.yml/badge.svg)](https://github.com/eliware/ssh-client/actions)

> A simple, ESM-first SSH client for Node.js with private key authentication and sequential command execution.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [ESM Example](#esm-example)
  - [CommonJS Example](#commonjs-example)
- [API](#api)
- [TypeScript](#typescript)
- [License](#license)

## Features

- Simple SSH command execution for Node.js
- Private key authentication only (no password support)
- Sequential execution of multiple commands in a single SSH session
- Returns merged stdout/stderr and exit code for each command
- TypeScript type definitions included
- Fully ESM compatible
- Easily testable/mocked via dependency injection

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

### CommonJS Example

```js
const {{ sshExec }} = require('@eliware/ssh-client');

(async () => {
  const results = await sshExec({
    host: 'your.ssh.server',
    username: 'youruser',
    commands: ['echo Hello, SSH!', 'uname -a'],
  });
  for (const [i, { result, code }] of results.entries()) {
    console.log(`Command #${i + 1} exit code: ${code}`);
    console.log(result);
  }
})();
```

## API

### sshExec(options)

Executes one or more commands on a remote SSH server using private key authentication.

#### Parameters

- `host` (string): Hostname or IP address (required)
- `port` (number): SSH port (default: 22)
- `username` (string): SSH username (default: current user)
- `commands` (string[]): List of commands to execute (required)

#### Returns

- `Promise<Array<{ result: string, code: number }>>`: Resolves to an array of results for each command, with merged stdout/stderr and exit code.

#### Throws

- If connection or authentication fails, or if no private key is found in `~/.ssh/`.

## TypeScript

Type definitions are included:

```ts
export interface SshExecOptions {
  host: string;
  port?: number;
  username?: string;
  commands: string[];
}

export interface SshExecResult {
  result: string;
  code: number;
}

export declare function sshExec(options: SshExecOptions): Promise<SshExecResult[]>;
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
