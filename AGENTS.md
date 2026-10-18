# AGENTS.md

## Project

Maintain `@eliware/ssh-client` as a Node.js 26 or later library with native ESM.

## Scope and boundaries

Keep the SSH API, source, tests, and docs in this repository.
Keep shared requirements in Eliware Test.
Keep release steps in Eliware Operations.

## Layout

Keep runtime source under `src/`.
Keep tests under `tests/` and mirror every `.mjs` source file.
Keep docs under `docs/`, specifications under `specs/`, and examples under `examples/`.
Keep source files to 100 lines or less.
Keep test files to 200 lines or less.

## Development

Read the README, related docs, specifications, source, and tests before edits.
Give each source and test module one purpose.
Keep the public API, declarations, and examples in sync.

## Validation

Run `npm test` for aggregate validation.
Run `npm run lint` for lint checks.
Run `npm run format:check` for format checks.
Run `npm run audit` for package checks.
Run `npm run format` only when you want to change formatting.
Run `git diff --check` before handoff.

## Security

Keep credentials, tokens, private keys, and machine-specific values out of source.
Do not commit secret values.
Verify hosts with approved known-host data.
Keep private keys out of source, tests, examples, and package contents.

## Changes

Preserve API behavior and host trust checks.
Update docs, declarations, examples, and release notes when they apply.
Publish only after approval through the Eliware Operations release handoff.

## Library

Use `src/public-api.mjs` as the public runtime entrypoint.
Keep public declarations in `src/public-api.d.ts`.
Run focused tests first during development.
Run one test file with `npm test -- tests/path/to/example.test.mjs`.
Run multiple test files with `npm test -- tests/path/to/first.test.mjs tests/path/to/second.test.mjs`.
Prevent repeated full-suite runs during development.

Run the full `npm test` suite for final validation before a commit, milestone, or release.
Run `npm run typecheck` and `npm run pack` before release inspection.

## npm publication

Keep `src/`, `docs/`, `README.md`, `AGENTS.md`, `LICENSE`, `RELEASE_NOTES.md`, `examples/`, and `specs/` in `package.json.files`.
Use npm provenance.
Check the exact package version at `registry.npmjs.org` before release inspection.
Run TagIt preflight with Eli and the developer.

Let Eli select release readiness and instruct DevOps.
Let DevOps publish the package.
Use the Eliware Operations handoff for publication approval.
