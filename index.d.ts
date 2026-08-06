export type HostVerifier = (key: string, verify: (ok: boolean) => void) => boolean | void;
export interface SshExecOptions { host: string; port?: number; username?: string; commands: string[]; privateKey?: string; privateKeyPath?: string; passphrase?: string; agent?: string; hostVerifier?: HostVerifier; knownHosts?: string; connectTimeout?: number; commandTimeout?: number; maxOutput?: number; cwd?: string; env?: Record<string, string>; pty?: boolean; shell?: boolean; ClientClass?: any; fsLib?: any; homedirFn?: () => string; }
export interface SshExecResult { command: string; stdout: string; stderr: string; result: string; code: number; signal?: string; duration?: number; }
export class SshError extends Error { code: string; cause?: unknown; }
export declare function sshExec(options: SshExecOptions): Promise<SshExecResult[]>;
