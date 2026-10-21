# Release Notes

## 15.0.0 — 2026-10-21

### Added

- Add injectable structured logging with operation details and sensitive-value protection.
- Add an opt-in integration example for SSH commands, SFTP file copies, and host certificates.
- Add end-user guides for installation, environment variables, APIs, connections, authentication,
  host verification, commands, shells, file copies, and errors.

### Changed

- Set the package version to 15.0.0 and update `@eliware/log` and `@eliware/test` to 15.0.0.
- Align package metadata, specifications, validation, CI, npm publication, and Knit deployment
  with Eliware Test 15.0.
- Organize connection, execution, key, host-record, logging, shell, and file-copy code into focused
  modules with matching tests.
- Replace the previous publication workflow with the canonical npm workflow.
- Update examples, API declarations, and documentation for current package behavior.

### Fixed

- Clean up connections and streams after commands end, errors, timeouts, and cancellation.
- Validate upload modes, known-host records, host certificates, and command output at focused
  module boundaries.
- Correct validation messages and examples to match current behavior.

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
