# [![eliware.org](https://eliware.org/logos/brand.png)](https://discord.gg/M6aTR9eTwN)

## @eliware/ssh-client [![npm](https://img.shields.io/npm/v/@eliware/ssh-client)](https://www.npmjs.com/package/@eliware/ssh-client) [![License](https://img.shields.io/github/license/eliware/ssh-client)](https://github.com/eliware/ssh-client/blob/main/LICENSE) [![CI](https://github.com/eliware/ssh-client/actions/workflows/ci.yaml/badge.svg)](https://github.com/eliware/ssh-client/actions/workflows/ci.yaml)

An ESM-first Node.js SSH client with host-key checks, long-lived connections, command execution, interactive shells, and SFTP transfers.

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

Run SSH commands, open shells, copy files, and verify host keys through Node.js.

## Requirements

Use Node.js 26 or later with native ESM.
Configure trusted host data and an authentication method for each SSH server.

## Setup

Run `npm install @eliware/ssh-client` in your project.
Read the [installation guide](docs/usage.md) before you connect.

## Usage

Import `sshExec` to run commands.
Read the [user guide](docs/README.md) for connection, command, shell, file copy, and host verification details.
Read [RELEASE_NOTES.md](RELEASE_NOTES.md) for release history.

## Development

Read the [specifications index](specs/README.md) for repository requirements.

## Testing

Run `npm test` for aggregate validation.

## Troubleshooting

Read the [troubleshooting guide](docs/troubleshooting.md) when an operation fails.

## Security

Read the [host verification guide](docs/security.md) before you configure host trust or authentication.

## API

The package exports its public API from `src/public-api.mjs` and its declarations from `src/public-api.d.ts`.
Read the [API guide](docs/api.md) for exported functions and options.

## Packaging

The package includes `src/`, `docs/`, `README.md`, `AGENTS.md`, `LICENSE`, `RELEASE_NOTES.md`, `examples/`, and `specs/`.
Use a numeric `MAJOR.MINOR.PATCH` version and a matching `v<version>` tag.
The npm workflow validates the tagged version, runs `npm test`, and publishes with provenance.
Follow Eliware Operations procedures for release authorization.

## Examples

Run `node examples/example.mjs` from the repository root.
Read [examples/README.md](examples/README.md) for example requirements.

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
