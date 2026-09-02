// codescope ignore: internal module barrel preserves the root compatibility facade.
export { SshError } from './errors.mjs';
export { loadKey } from './keys.mjs';
export { expandPath } from './paths.mjs';
export { createHostVerifier } from './security/known-hosts/verification/verifier.mjs';
export { sshExec } from './exec/runner/pipeline/execute.mjs';
export { connect } from './connection/lifecycle/client/connect.mjs';
export { upload, download } from './transfer.mjs';
