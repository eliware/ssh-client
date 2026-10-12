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

- Run one or more commands through SSH.
- Reuse a connection for commands, shells, and file transfers.
- Verify host keys and OpenSSH host certificates.
- Use a private key, password, or SSH agent.
- Set time limits and cancellation signals.
- Use typed public API declarations.

## Requirements

- Use Node.js 26 or later with native ESM.
- Provide trusted host-key data or a host certificate authority.
- Provide access through a private key, password, or SSH agent.

## Setup

Install the package with `npm install @eliware/ssh-client`.
Read the [installation and connection guide](docs/usage.md) before first use.

## Usage

Import `sshExec` to run commands.
Read the [user guide](docs/README.md) for shell, transfer, and connection examples.
Read [RELEASE_NOTES.md](RELEASE_NOTES.md) for release history.

## Development

Run `npm ci` to install the locked packages.
Read [docs/README.md](docs/README.md), [specs/README.md](specs/README.md), and [examples/README.md](examples/README.md) before edits.

## Testing

Run `npm test` for aggregate validation.

## Troubleshooting

Read the [troubleshooting guide](docs/troubleshooting.md) when an operation fails.

## Security

Read the [security guide](docs/security.md) before you set host verification or authentication options.

## API

The package exports `connect`, `sshExec`, `createHostVerifier`, `loadKey`, `expandPath`, `upload`, `download`, and `SshError`.
Read the [API guide](docs/api.md) and declarations in `src/public-api.d.ts`.

## Packaging

The package includes `src/`, `docs/`, `examples/`, `specs/`, and required root files.
Run `npm run pack` to check package contents.

## Examples

Read [examples/README.md](examples/README.md) for the runnable example.
Use your own host data and key files.

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
