# AGENTS.md

## Project

Maintain `@eliware/ssh-client`, a Node.js 26 or later library with native ESM.

## Scope and boundaries

This repository owns the SSH client API, implementation, tests, and documentation. It does not own consumer repositories or deployment systems. Shared requirements live in Eliware Test. Release steps live in Eliware Operations.

## Layout

Keep implementation modules under `src/`. Mirror each `.mjs` module with one test under `tests/`. Keep documentation under `docs/`, specifications under `specs/`, and examples under `examples/`.

## Development

Read this file, `README.md`, and relevant docs, specs, source, and tests before edits. Give each source and test module one purpose. Coordinators may sequence work and call focused helpers. Move separate policies and operations into focused modules with mirrored tests. Keep each source file at or below 100 lines and each test file at or below 200 lines.

## Validation

Use Node.js 26 or later and npm 12 or later. Run `npm test` for aggregate validation. Run `npm run lint`, `npm run format:check`, `npm run audit`, `npm run typecheck`, or `npm run pack` as needed. Use `npm run format` only when you want to change formatting. Run `git diff --check` before handoff.

## Security

Protect credentials, tokens, private keys, and machine-specific values. Never commit secret values. Verify hosts with approved known-host data. Keep private keys out of source, tests, examples, and package contents.

## Changes

Preserve API behavior and security checks. Update tests, declarations, docs, specs, and release notes when they apply. Publish only after approval through the Eliware Operations release handoff.

## Library

The public runtime entrypoint is `src/public-api.mjs`. Its declarations are in `src/public-api.d.ts`. Keep the public API, declarations, and examples aligned. Run `npm run typecheck` and `npm run pack` before release consideration.

## npm publication

The public package is `@eliware/ssh-client`. `package.json.version` sets its version. Keep `src/`, `docs/`, `README.md`, `AGENTS.md`, `LICENSE`, `RELEASE_NOTES.md`, `examples/`, and `specs/` in `package.json.files`. Run `npm run pack` to check package contents. Pack validation must pass before publication. Use npm provenance. Verify the exact version at `registry.npmjs.org`. Eli and the developer run TagIt preflight together. Eli decides release readiness and instructs DevOps. DevOps performs the release. Use the Eliware Operations handoff for publication approval.
