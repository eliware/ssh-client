import {
  SshError as SshErrorImpl,
  createHostVerifier as createHostVerifierImpl,
  sshExec as sshExecImpl,
  connect as connectImpl,
  loadKey as loadKeyImpl,
  expandPath as expandPathImpl,
  upload as uploadImpl,
  download as downloadImpl,
} from './src/public-api.mjs';

export const SshError = SshErrorImpl;
export const createHostVerifier = createHostVerifierImpl;
export const sshExec = sshExecImpl;
export const connect = connectImpl;
export const loadKey = loadKeyImpl;
export const expandPath = expandPathImpl;
export const upload = uploadImpl;
export const download = downloadImpl;
