# AGENTS.md

## Project

Maintain Eliware's `@eliware/ssh-client` as a Node.js 26 or later library with native ESM.

## Scope and boundaries

Keep repository requirements in `specs/directives.yaml`.
Follow Eliware Operations procedures for release authorization.

## Layout

Use `README.md` and `specs/README.md` to find repository content.

## Development

Read the repository specifications before you change files.

## Validation

Run `npm test` for aggregate validation.
Run `npm run lint` for lint checks.
Run `npm run audit` for dependency checks.
Run `npm run format` to format files.
Run `npm run format:check` to check formatting.

## Security

Follow the [host trust guide](docs/security.md) for host verification and credential guidance.

## Changes

Keep each requirement in its authoritative specification.

## Library

Run focused tests first during development.
Run one test file with `npm test -- tests/path/to/example.test.mjs`.
Run multiple test files with `npm test -- tests/path/to/first.test.mjs tests/path/to/second.test.mjs`.
Prevent repeated full-suite runs during development.
Run the full `npm test` suite for final validation before a commit, milestone, or release.

## npm publication

Run `npm run pack` to check package contents.
Follow Eliware Operations procedures for publication approval.
