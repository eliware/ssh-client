# [![eliware.org](https://eliware.org/logos/brand.png)](https://discord.gg/M6aTR9eTwN)

## @eliware/ssh-client [![npm](https://img.shields.io/npm/v/@eliware/ssh-client)](https://www.npmjs.com/package/@eliware/ssh-client) [![License](https://img.shields.io/github/license/eliware/ssh-client)](https://github.com/eliware/ssh-client/blob/main/LICENSE) [![CI](https://github.com/eliware/ssh-client/actions/workflows/ci.yaml/badge.svg)](https://github.com/eliware/ssh-client/actions/workflows/ci.yaml)

An ESM-first Node.js SSH client with secure host verification, reusable connections, command execution, interactive shells, and SFTP transfers.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Setup](#setup)
- [Usage](#usage)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [API](#api)
- [Packaging](#packaging)
- [Examples](#examples)
- [Support](#support)
- [Links](#links)
- [License](#license)

## Features

- Execute one or more commands through SSH.
- Reuse an SSH connection for command, shell, and SFTP operations.
- Verify host keys and OpenSSH host certificates.
- Use private-key or password authentication.
- Set timeouts and cancellation signals for operations.
- Use interactive shells with terminal settings.
- Upload and download files through SFTP.
- Use typed declarations for the public API.

## Requirements

- Use Node.js 26 or later with native ESM.
- Use an SSH server and valid host verification data.
- Use private-key or password authentication.

## Setup

Run `npm install @eliware/ssh-client` to install the package. Check the npm registry for the current published version. The package version in this checkout does not confirm publication.

## Usage

Import the API from `@eliware/ssh-client`.

```js
import { sshExec } from "@eliware/ssh-client";

const results = await sshExec({
  host: "router.example",
  username: "operator",
  knownHosts: "router.example ssh-ed25519 BASE64_HOST_KEY",
  commands: ["show version"],
});

console.log(results[0].result);
```

For a reusable connection, call `connect()` and close it after use. Read [RELEASE_NOTES.md](RELEASE_NOTES.md) for release history.

## Development

Run `npm ci` to install locked dependencies. Read [docs/README.md](docs/README.md), [specs/README.md](specs/README.md), and [examples/README.md](examples/README.md) before you change the library.

## Testing

Run `npm test` for aggregate validation and coverage. Run `npm run lint`, `npm run format:check`, `npm run audit`, `npm run typecheck`, and `npm run pack` for focused checks. Run `npm run format` to format files.

## Troubleshooting

Check that the host key matches the configured known-hosts record. Check that the key or password has access to the host. Read [the troubleshooting guide](docs/troubleshooting.md) for more help.

## Security

Verify every SSH host with known-hosts data or a host certificate authority. Keep private keys and passwords outside the repository. Use only safe placeholders in examples.

## API

The public API exports `connect`, `sshExec`, `createHostVerifier`, `loadKey`, `expandPath`, `upload`, and `download`. The declarations in `src/public-api.d.ts` define the supported input and output types.

## Packaging

The package includes `src/`, `docs/`, `examples/`, `specs/`, and the required root files. Run `npm run pack` to check the package contents.

## Examples

Read [examples/README.md](examples/README.md) for the runnable examples. The examples use placeholder host and key data.

## Support

For help, questions, or to chat with the author and community, visit:

[![Discord](https://eliware.org/logos/discord_96.png)](https://discord.gg/M6aTR9eTwN)[![eliware.org](https://eliware.org/logos/eliware_96.png)](https://discord.gg/M6aTR9eTwN)

**[eliware.org on Discord](https://discord.gg/M6aTR9eTwN)**

## Links

- [Home Page](https://eliware.org)
- [GitHub Org](https://github.com/eliware)
- [GitHub Repo](https://github.com/eliware/ssh-client)
- [Bug Reports](https://github.com/eliware/ssh-client/issues)
- [npm](https://www.npmjs.com/package/@eliware/ssh-client)
- [Discord](https://discord.gg/M6aTR9eTwN)

## License

[MIT © Eliware](LICENSE)
