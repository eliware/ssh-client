# Release Notes

## 15.0.1 — 2026-10-26

### Changed

- Set the package version to 15.0.1.
- Update `@eliware/log` and `@eliware/test` to 15.0.1.
- Refresh the lockfile with current compatible dependency versions.
- Move host-verification policy and error-context creation into focused modules.
- Keep connection validation focused on host, port, and timeout values.

## 15.0.0 — 2026-10-21

### Added

- Add an optional structured logger for SSH operations and command results.
- Add an opt-in integration example for commands, file copies, and host certificates.
- Add end-user guides for setup, authentication, host trust, commands, shells, file copies, and errors.

### Changed

- Set the package version and Eliware logging and test dependencies to 15.0.0.
- Align package metadata, specifications, validation, CI, npm publication, and Knit deployment with Eliware Test 15.
- Split connection, command, key, host trust, logging, shell, and file copy code into focused modules with matching tests.
- Use the canonical npm publication workflow and remove the previous publication workflow.
- Update examples, API declarations, and user guides for current behavior.
- Keep internal execution options out of the public TypeScript API and align helper types with runtime results.

### Fixed

- Close connections and streams after commands run, errors occur, time limits expire, or cancellation occurs.
- Retry a failed connection close and accept readiness events during setup.
- Validate plain known-host keys, host certificates, upload modes, and command output.
- Reject host certificate extensions that the client does not apply.
- Wait for asynchronous SFTP cleanup and report cleanup failures.
- Correct validation messages, integration requirements, and examples.

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
