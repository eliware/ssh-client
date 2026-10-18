# Release Notes

## 13.0.0 — 2026-10-17

### Changed

- Group related source and test files in matching folders.
- Set package metadata to version 13.0.0.
- Add the npm release workflow and update the Knit deployment commands.

## 12.0.0 — 2026-10-12

### Added

- Add terminal type, column count, and row count options to long-lived shells.

### Changed

- Move runtime code into focused native ESM modules under `src/`.
- Keep the public runtime entry point and TypeScript declarations under `src/`.
- Document installation, host verification, authentication, commands, shells, file copies, and errors.
- Align package metadata, validation, and workflows with v12 conventions.
- Update shared test tooling and check package contents during aggregate validation.

### Fixed

- Remove SSH connection listeners after each operation on a shared connection.
- Correct command test paths for Windows.

## 2.1.0 — 2026-09-02

### Changed

- Use one rule set for shared connection close, timeouts, and TCP endpoints.
- Add structured operations and per-operation cancellation.
- Standardize command, shell, and SFTP validation and cleanup.
- Add certificate support through `@eliware/ssh2`.

## 2.0.0 — 2026-08-24

### Changed

- Update the shared `@eliware/test` development package.
- Enforce full coverage and lint checks through shared tools.

## 1.2.0 — 2026-08-24

### Added

- Add long-lived connections, password authentication, known-host checks, and host certificates.
- Add TypeScript declarations for connection and host-verifier APIs.

### Changed

- Split source and tests into focused matching modules.
- Standardize test, lint, typecheck, package, audit, and release workflows.
