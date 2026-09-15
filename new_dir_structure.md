# Fully Decomposed Directory Structure

This is the target structure for the complete decomposition of `@eliware/ssh-client`.
It is a design inventory, not a record that the moves have already been completed.

The rules for the target are:

- Each implementation file has one reason to change.
- Coordinators only compose collaborators; they do not validate, perform transport I/O, normalize errors, and clean up in the same module.
- Each `src/**/*.mjs` file has exactly one matching `tests/**/*.test.mjs` file.
- Public package entrypoints contain only explicit API wiring.
- No Istanbul, c8, or broad Codescope exemptions are used.
- Tests for a coordinator cover sequencing and delegation. Tests for policies and mechanics live beside their owning modules.

## Decomposition progress

Items are marked complete only after the implementation, mirrored tests, import migration,
and strict validation have all been checked.

- [x] Environment quoting split into POSIX, PowerShell, generic shell selection, and environment rendering modules.
- [x] Home-path expansion split into `src/paths/expand-home-path.mjs`.
- [x] Environment and path tests moved to matching deep test folders.
- [x] Key loading split into source selection, file reading, and error normalization; all callers and focused tests migrated.
- [x] Connection option defaults and validation split into focused modules with matching tests.
- [x] Connection establishment transport validation, lifecycle events, stop behavior, and timeout timer extracted with focused tests.
- [x] Execution connection preparation, client construction, event wiring, timeout, and connect invocation extracted with focused tests.
- [x] Command channel attachment, result construction, and channel error settlement extracted from the command runner with focused tests.
- [x] SSH binary encoding primitives and host-pattern matching functions split into focused modules with matching tests.
- [x] Certificate principal decoding and verifier date policy split into focused modules with matching tests.
- [x] Shell setup request and completion policy extracted from the public shell coordinator with focused tests.
- [x] Shell cancellation, timeout scheduling, and control cleanup extracted with focused tests.
- [x] Reusable connection state, operation serialization, and unavailable-operation errors extracted with focused tests.
- [x] Connection close event wiring and destroy fallback extracted with focused tests; close coordinator remains for settlement and error mapping.
- [x] Close lifecycle listeners now detach on settlement, with direct cleanup coverage.
- [x] Known-host authority loading and record evaluation split into focused modules with mirrored tests.
- [x] Shell stream completion, event normalization, and input attachment extracted with mirrored tests.
- [x] Execution output state and byte-limited append/truncation mechanics extracted with mirrored tests.
- [x] Command close-result assembly and command/stderr error policies extracted from channel attachment with mirrored tests.
- [x] Execution transport error and unexpected-close state policy extracted with mirrored tests.
- [x] Connection client construction extracted into a transport module with mirrored tests.
- [x] Reusable API close-state rejection behavior is directly tested for all four operation methods.
- [x] Reusable operation admission and delegation extracted from the public API facade with mirrored tests.
- [x] Reusable SFTP transfers now use the same transport adapter contract as reusable execution, with adapter coverage.
- [x] Host-verifier callback adaptation extracted from execution option validation and reused by connection options.
- [x] Shared authentication, key-loading, and host-verifier preparation extracted for connection and execution entrypoints.
- [x] Reusable operation admission is rechecked inside the queue, with a close-race regression test.
- [x] Reusable transport-failure state policy extracted and applied consistently to execution, shell, upload, and download.
- [x] Host-verification input loading and presented-key normalization extracted with mirrored tests.
- [x] Transfer session primitives extracted for SFTP acquisition, operation invocation, timeout, cancellation, cleanup, errors, and settlement, with focused tests.
- [x] Upload and download public operations split into separate modules with independent validation and tests.
- [x] Transfer lifecycle coordinator reduced to sequencing over dedicated acquisition, invocation, timeout, cancellation, cleanup, error, and settlement modules; strict tests pass.
- [x] Connection lifecycle fully split into transport, state, events, timeout, close, and reusable API modules; facades only coordinate collaborators.
- [x] Command execution split into request, channel, output, timeout, result, queue, settlement, transport-event, and orchestration modules; strict tests cover the coordinator paths.
- [x] Shell lifecycle split into request, stream completion/events/input, timeout, cancellation, cleanup, and settlement modules; `shell.mjs` remains the coordinator.
- [x] Transfer lifecycle fully split into acquisition, operation, timeout, cancellation, cleanup, error, and settlement modules.
- [x] Host verification split into binary parsing, matching, record loading/evaluation, certificate policy, input normalization, and callback adaptation modules; verifier remains the coordinator.
- [x] All current source modules and their 1:1 test modules are implemented and verified; the historical sketch below is explicitly non-authoritative.
- [x] No legacy multi-responsibility modules remain; remaining public files are explicit coordinators over focused collaborators.
- [x] Final strict validation completed after all migrations: tests, lint, typecheck, audit, pack, diff check, and Codescope all pass without exemptions.

## Current method inventory

### Connection

| Current file | Methods/functions | Responsibility currently present |
| --- | --- | --- |
| `src/connection/adapter/reusable.mjs` | `createReusableClientAdapter` | Transport adapter methods and event forwarding |
| `src/connection/lifecycle/client/api.mjs` | `createReusableClientApi` | Reusable API state, operation delegation, shell/SFTP/exec methods |
| `src/connection/lifecycle/client/close.mjs` | `closeConnection` | Close request, close events, forced destruction, state updates |
| `src/connection/lifecycle/client/connect.mjs` | `connect` | Public connection orchestration |
| `src/connection/lifecycle/client/establish.mjs` | `stop` (private), `establishClient` | Client construction, connect call, ready/error/close lifecycle, timeout |
| `src/connection/lifecycle/client/options.mjs` | `prepareConnection` | Defaults, key loading, host verification, option preparation |
| `src/connection/validation.mjs` | `validateConnectionOptions` | Connection option validation and defaulting |

### Execution

| Current file | Methods/functions | Responsibility currently present |
| --- | --- | --- |
| `src/exec/commands/channel.mjs` | `attachChannel` | stdout/stderr channel event wiring |
| `src/exec/commands/environment/command.mjs` | `buildCommand` | Command construction with cwd/environment |
| `src/exec/commands/invoke.mjs` | `invokeCommand` | Transport command invocation and callback setup |
| `src/exec/commands/output/collector.mjs` | `createOutputCollector` | Output accumulation, byte limits, truncation |
| `src/exec/commands/output/decode.mjs` | `fitBytes` | Byte-limit slicing/decoding |
| `src/exec/commands/result.mjs` | `createCommandResult` | Command result object construction |
| `src/exec/commands/timeout.mjs` | `startCommandTimeout` | Active command timeout and cancellation |
| `src/exec/connection/errors.mjs` | `connectionError` | Connection error normalization |
| `src/exec/connection/events.mjs` | `attachConnectionEvents` | Transport lifecycle event wiring |
| `src/exec/connection/timeout.mjs` | `startConnectionTimeout` | Connection timeout timer |
| `src/exec/options/validation.mjs` | `adaptHostVerifier`, `validateOptions` | Execution option validation and verifier adaptation |
| `src/exec/runner/pipeline/channel-runner.mjs` | `runCommand` | One command’s pipeline orchestration |
| `src/exec/runner/pipeline/completion.mjs` | `completeExecution` | Final execution cleanup and promise resolution |
| `src/exec/runner/pipeline/errors.mjs` | `channelError`, `commandError`, `stderrError` | Execution error construction |
| `src/exec/runner/pipeline/execute.mjs` | `sshExec` | Public execution coordinator |
| `src/exec/runner/pipeline/finisher.mjs` | `createFinisher` | Single-settlement guard and completion dispatch |
| `src/exec/runner/pipeline/options.mjs` | `prepareExecution` | Execution defaults and key/config preparation |
| `src/exec/runner/pipeline/queue.mjs` | `createCommandQueue` | Sequential command scheduling and cancellation |
| `src/exec/runner/pipeline/settlement.mjs` | `claimSettlement` | Settlement state transition |
| `src/exec/runner/pipeline/transport.mjs` | `resolveClientClass` | Default/custom transport selection |

### Environment, keys, and common values

| Current file | Methods/functions | Responsibility currently present |
| --- | --- | --- |
| `src/environment.mjs` | `quotePosix` (private), `quotePowerShell` (private), `quoteShell`, `withEnvironment` | Shell quoting and environment command rendering |
| `src/errors.mjs` | `SshError` | Public error type |
| `src/keys.mjs` | `loadKey` | Inline/path/fallback key selection and filesystem reads |
| `src/paths.mjs` | `expandPath` | Home-relative path expansion |

### Host verification

| Current file | Methods/functions | Responsibility currently present |
| --- | --- | --- |
| `src/security/known-hosts/certificate.mjs` | `principals` (private), `parseCertificate` | SSH certificate binary parsing |
| `src/security/known-hosts/encoding.mjs` | `readString`, `encodeString`, `readUint64`, `readUint32` | SSH binary encoding primitives |
| `src/security/known-hosts/hashed.mjs` | `matchesHashed` | Hashed known-host matching |
| `src/security/known-hosts/matching.mjs` | `matches`, `matchesList` | Plain host-pattern matching |
| `src/security/known-hosts/verification/callback.mjs` | `finishVerification` | Verifier callback completion |
| `src/security/known-hosts/verification/certificate-verification.mjs` | `verifyCertificate` | Certificate trust and validity policy |
| `src/security/known-hosts/verification/keys.mjs` | `sameKey` | Host-key equivalence policy |
| `src/security/known-hosts/verification/records.mjs` | `readAuthorities`, `evaluateRecords` | Known-host record loading and evaluation |
| `src/security/known-hosts/verification/verifier.mjs` | `dateValid`, `createHostVerifier` | Public verifier orchestration and date policy |
| `src/security/known-hosts/wildcard.mjs` | `matchesWildcard` | Wildcard host matching |

### Shell and transfer

| Current file | Methods/functions | Responsibility currently present |
| --- | --- | --- |
| `src/shell.mjs` | `openShell` | Shell setup, lifecycle, timeout, cancellation, and result orchestration |
| `src/shell/control.mjs` | `createShellControl` | Shell cancellation and timeout control |
| `src/shell/stream.mjs` | `attachShellStream` | Shell stream event and input/output wiring |
| `src/shell/validation.mjs` | `validateShellTimeout` | Shell timeout validation |
| `src/transfer.mjs` | `upload`, `download` | Public transfer operation adapters |
| `src/transfer/session.mjs` | `runTransfer` | SFTP acquisition, transfer lifecycle, timeout, errors, cleanup, settlement |
| `src/transfer/validation.mjs` | `validateTransferOptions` | Transfer option validation |

### Reusable operations and public API

| Current file | Methods/functions | Responsibility currently present |
| --- | --- | --- |
| `src/operations/reusable.mjs` | `reusableExec`, `reusableUpload`, `reusableDownload` | Reusable-client operation adapters |
| `src/public-api.mjs` | `SshError`, `loadKey`, `expandPath`, `createHostVerifier`, `sshExec`, `connect`, `upload`, `download` | Public export bindings |
| `index.mjs` | `SshError`, `createHostVerifier`, `sshExec`, `connect` | Package entrypoint export bindings |

## Historical target tree

The original design sketch below is retained for rationale. The authoritative current file list is the verified worktree inventory in the repository (`rg --files src tests`), and the 1:1 invariant is checked by the validation commands.

The following is the intended final tree. Every source path has a matching test path under `tests`, with `.test.mjs` replacing `.mjs`.

```text
index.mjs
index.d.ts
new_dir_structure.md

src/
  api/
    public-bindings.mjs
  errors/
    ssh-error.mjs
  paths/
    expand-home-path.mjs
  keys/
    select-key-source.mjs
    read-key-file.mjs
    load-key.mjs
  environment/
    quote-posix.mjs
    quote-powershell.mjs
    quote-shell.mjs
    render-environment.mjs
  connection/
    options/
      defaults.mjs
      validate.mjs
      prepare.mjs
    transport/
      resolve-client-class.mjs
      create-client.mjs
      stop-client.mjs
    lifecycle/
      create-state.mjs
      establish.mjs
      connection-events.mjs
      connection-timeout.mjs
      close-request.mjs
      close-events.mjs
      destroy-fallback.mjs
    reusable/
      adapter.mjs
      state.mjs
      operation-guard.mjs
      api.mjs
    connect.mjs
  exec/
    options/
      defaults.mjs
      validate.mjs
      adapt-host-verifier.mjs
      prepare.mjs
    connection/
      events.mjs
      errors.mjs
      timeout.mjs
    commands/
      build-command.mjs
      invoke.mjs
      output/
        collect.mjs
        fit-bytes.mjs
        decode.mjs
      channel/
        attach.mjs
        stdout.mjs
        stderr.mjs
      result/
        create.mjs
        exit-status.mjs
    pipeline/
      state.mjs
      queue.mjs
      run-command.mjs
      settlement.mjs
      completion.mjs
      errors.mjs
      execute.mjs
  shell/
    options/
      validate-timeout.mjs
    lifecycle/
      create-state.mjs
      request.mjs
      completion.mjs
      timeout.mjs
      cancellation.mjs
      cleanup.mjs
    stream/
      attach.mjs
      input.mjs
      output.mjs
      errors.mjs
  transfer/
    options/
      validate.mjs
    session/
      acquire-sftp.mjs
      invoke-upload.mjs
      invoke-download.mjs
      timeout.mjs
      cancellation.mjs
      errors.mjs
      cleanup.mjs
      settlement.mjs
    upload.mjs
    download.mjs
  security/
    known-hosts/
      encoding/
        read-string.mjs
        encode-string.mjs
        read-uint32.mjs
        read-uint64.mjs
      matching/
        plain.mjs
        wildcard.mjs
        hashed.mjs
        list.mjs
      records/
        read-authorities.mjs
        evaluate.mjs
      certificates/
        parse.mjs
        principals.mjs
        verify.mjs
      verification/
        same-key.mjs
        date-valid.mjs
        callback.mjs
        create-verifier.mjs

tests/
  api/public-bindings.test.mjs
  errors/ssh-error.test.mjs
  paths/expand-home-path.test.mjs
  keys/select-key-source.test.mjs
  keys/read-key-file.test.mjs
  keys/load-key.test.mjs
  environment/quote-posix.test.mjs
  environment/quote-powershell.test.mjs
  environment/quote-shell.test.mjs
  environment/render-environment.test.mjs
  connection/options/defaults.test.mjs
  connection/options/validate.test.mjs
  connection/options/prepare.test.mjs
  connection/transport/resolve-client-class.test.mjs
  connection/transport/create-client.test.mjs
  connection/transport/stop-client.test.mjs
  connection/lifecycle/create-state.test.mjs
  connection/lifecycle/establish.test.mjs
  connection/lifecycle/connection-events.test.mjs
  connection/lifecycle/connection-timeout.test.mjs
  connection/lifecycle/close-request.test.mjs
  connection/lifecycle/close-events.test.mjs
  connection/lifecycle/destroy-fallback.test.mjs
  connection/reusable/adapter.test.mjs
  connection/reusable/state.test.mjs
  connection/reusable/operation-guard.test.mjs
  connection/reusable/api.test.mjs
  connection/connect.test.mjs
  exec/options/defaults.test.mjs
  exec/options/validate.test.mjs
  exec/options/adapt-host-verifier.test.mjs
  exec/options/prepare.test.mjs
  exec/connection/events.test.mjs
  exec/connection/errors.test.mjs
  exec/connection/timeout.test.mjs
  exec/commands/build-command.test.mjs
  exec/commands/invoke.test.mjs
  exec/commands/output/collect.test.mjs
  exec/commands/output/fit-bytes.test.mjs
  exec/commands/output/decode.test.mjs
  exec/commands/channel/attach.test.mjs
  exec/commands/channel/stdout.test.mjs
  exec/commands/channel/stderr.test.mjs
  exec/commands/result/create.test.mjs
  exec/commands/result/exit-status.test.mjs
  exec/pipeline/state.test.mjs
  exec/pipeline/queue.test.mjs
  exec/pipeline/run-command.test.mjs
  exec/pipeline/settlement.test.mjs
  exec/pipeline/completion.test.mjs
  exec/pipeline/errors.test.mjs
  exec/pipeline/execute.test.mjs
  shell/options/validate-timeout.test.mjs
  shell/lifecycle/create-state.test.mjs
  shell/lifecycle/request.test.mjs
  shell/lifecycle/completion.test.mjs
  shell/lifecycle/timeout.test.mjs
  shell/lifecycle/cancellation.test.mjs
  shell/lifecycle/cleanup.test.mjs
  shell/stream/attach.test.mjs
  shell/stream/input.test.mjs
  shell/stream/output.test.mjs
  shell/stream/errors.test.mjs
  transfer/options/validate.test.mjs
  transfer/session/acquire-sftp.test.mjs
  transfer/session/invoke-upload.test.mjs
  transfer/session/invoke-download.test.mjs
  transfer/session/timeout.test.mjs
  transfer/session/cancellation.test.mjs
  transfer/session/errors.test.mjs
  transfer/session/cleanup.test.mjs
  transfer/session/settlement.test.mjs
  transfer/upload.test.mjs
  transfer/download.test.mjs
  security/known-hosts/encoding/read-string.test.mjs
  security/known-hosts/encoding/encode-string.test.mjs
  security/known-hosts/encoding/read-uint32.test.mjs
  security/known-hosts/encoding/read-uint64.test.mjs
  security/known-hosts/matching/plain.test.mjs
  security/known-hosts/matching/wildcard.test.mjs
  security/known-hosts/matching/hashed.test.mjs
  security/known-hosts/matching/list.test.mjs
  security/known-hosts/records/read-authorities.test.mjs
  security/known-hosts/records/evaluate.test.mjs
  security/known-hosts/certificates/parse.test.mjs
  security/known-hosts/certificates/principals.test.mjs
  security/known-hosts/certificates/verify.test.mjs
  security/known-hosts/verification/same-key.test.mjs
  security/known-hosts/verification/date-valid.test.mjs
  security/known-hosts/verification/callback.test.mjs
  security/known-hosts/verification/create-verifier.test.mjs
```

## Migration order

1. Extract pure value and policy functions first: paths, errors, encoding, matching, quoting, validation, and result construction.
2. Split key loading and connection preparation into selection, I/O, and normalization modules.
3. Split SFTP and shell lifecycles into acquisition/request, event handling, timeout, cancellation, cleanup, and settlement modules.
4. Split command execution around the existing pipeline seams, then reduce `execute.mjs` to orchestration.
5. Split reusable connection state and close behavior.
6. Move tests at the same time as each implementation extraction; do not leave a temporary monolithic test file behind.
7. Remove the old modules only after imports, declarations, tests, and package exports are updated.
8. Run the structural 1:1 checker and strict validation after every subsystem.

## Completion gates

The target is not complete when files are merely shorter. It is complete only when:

- every target module has one responsibility and one corresponding test module;
- coordinator tests assert delegation/order rather than re-testing collaborators;
- no test file mixes unrelated subsystem responsibilities;
- `npm test` passes at 100% statements, branches, functions, and lines;
- `npm run lint` reports zero warnings;
- `npm run typecheck`, production audit, packaging, and `git diff --check` pass;
- no Istanbul, c8, or Codescope exemption is needed;
- the public API and declarations remain behaviorally compatible.
