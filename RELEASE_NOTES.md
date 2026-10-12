# Release Notes

## 12.0.0 — 2026-10-12

### Added

- Add terminal type, column count, and row count options to reusable shells.

### Changed

- Move runtime code into focused native ESM modules under `src/`.
- Keep the public runtime entry point and TypeScript declarations under `src/`.
- Document installation, host verification, authentication, commands, shells, transfers, and errors.
- Align package metadata, validation, and workflows with v12 conventions.
- Update shared test tooling and check package contents during aggregate validation.

### Fixed

- Remove SSH connection listeners after each operation on a reused connection.
- Fix command test paths for Windows.

## 2.1.0 — 2026-09-02

### Changed

- Harden reusable connection lifecycle, port, timeout, and close handling.
- Add structured reusable operations and per-operation cancellation.
- Standardize command, shell, and SFTP validation and cleanup.
- Add certificate support through `@eliware/ssh2`.

## 2.0.0 — 2026-08-24

### Changed

- Update the shared `@eliware/test` development package.
- Enforce full coverage and lint checks through shared tools.

## 1.2.0 — 2026-08-24

### Added

- Add reusable connections, password authentication, known-host checks, and host certificates.
- Add TypeScript declarations for connection and host-verifier APIs.

### Changed

- Split source and tests into focused matching modules.
- Standardize test, lint, typecheck, package, audit, and release workflows.

## 1.1.8 — 2026-08-08

### Fixed

- Stop the connection timer after SSH sends `ready`.
- Prevent a connection timeout during long commands.

## 1.1.7 — 2026-08-07

### Changed

- Align repository layout, metadata, validation, docs, CI, and package contents with Eliware library rules.
- Add declaration checks and standard package checks.

## 1.1.6 — 2026-08-07

### Fixed

- Correct package metadata format and dependency declarations.

## 1.1.5 — 2026-08-06

### Fixed

- Remove the last coverage exclusion from command completion.

## 1.1.4 — 2026-08-06

### Added

- Add host verification, authentication, timeouts, shells, transfers, and command APIs.
- Add declarations, examples, and tests.

## 1.1.3 — 2026-08-06

### Changed

- Add the standard Oxlint command and Node.js 26 maintenance updates.

## 1.1.2 — 2026-08-06

### Changed

- Standardize Node.js 26 CI, coverage scripts, and dependencies.

## 1.1.1 — 2025-12-09

### Added

- Create the first documented release.
