# Release Notes

## Unreleased

### Changed

- Prepare the package for v12 conventions.

## 12.0.0 — 2026-10-11

### Changed

- Align package metadata, validation, documentation, and workflows with v12 conventions.
- Add terminal settings to interactive shell options.
- Remove SSH transport listeners when an operation ends.

## 2.1.0 — 2026-09-02

### Changed

- Harden reusable connection lifecycle handling, ports, timeouts, and close operations.
- Add structured reusable operations and per-operation cancellation.
- Standardize command, shell, and SFTP validation and cleanup.
- Add certificate-capable transport support through `@eliware/ssh2`.

## 2.0.0 — 2026-08-24

### Changed

- Update the shared `@eliware/test` development dependency.
- Enforce complete coverage and lint validation through shared tooling.

## 1.2.0 — 2026-08-24

### Added

- Add reusable connections, password authentication, known-hosts validation, and host certificates.
- Add TypeScript declarations for the connection and host-verifier APIs.

### Changed

- Split implementation and tests into focused mirrored modules.
- Standardize test, lint, typecheck, package, audit, and release workflows.

## 1.1.8 — 2026-08-08

### Fixed

- Stop the connection timer after SSH emits `ready`.
- Prevent long commands from becoming connection timeouts.

## 1.1.7 — 2026-08-07

### Changed

- Align repository layout, metadata, validation, CI, docs, and package contents with Eliware library conventions.
- Add declaration checks and standard package validation.

## 1.1.6 — 2026-08-07

### Fixed

- Correct package metadata formatting and dependency declarations.

## 1.1.5 — 2026-08-06

### Fixed

- Remove the final coverage exclusion from command completion.

## 1.1.4 — 2026-08-06

### Added

- Add host verification, authentication, timeouts, shell, transfer, and command APIs.
- Add declarations, examples, and tests.

## 1.1.3 — 2026-08-06

### Changed

- Add the standard Oxlint command and Node.js 26 maintenance updates.

## 1.1.2 — 2026-08-06

### Changed

- Standardize Node.js 26 CI, coverage scripts, and dependencies.

## 1.1.1 — 2025-12-09

### Added

- Create the initial documented release.
