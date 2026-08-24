export type HostVerifier = (key: Buffer, verify: (ok: boolean) => void) => boolean | void | Promise<boolean>;
export interface SshExecOptions { host: string; port?: number; username?: string; commands: string[]; privateKey?: string; privateKeyPath?: string; passphrase?: string; agent?: string; hostVerifier?: HostVerifier; knownHosts?: string; knownHostsPath?: string; hostCaPath?: string; connectTimeout?: number; commandTimeout?: number; maxOutput?: number; cwd?: string; env?: Record<string, string>; pty?: boolean; shell?: boolean; ClientClass?: any; fsLib?: any; homedirFn?: () => string; }
export interface SshExecResult { command: string; stdout: string; stderr: string; result: string; code: number; signal?: string; duration?: number; }
export interface SshConnection { raw: any; exec(commands: string[]): Promise<SshExecResult[]>; shell(options?: { onData?: (data: Buffer) => void; onInput?: (stream: any) => void }): Promise<any>; upload(localPath: string, remotePath: string, mode?: number): Promise<void>; download(remotePath: string, localPath: string): Promise<void>; close(): Promise<void>; }
export class SshError extends Error { code: string; cause?: unknown; }
export declare function sshExec(options: SshExecOptions): Promise<SshExecResult[]>;
export declare function connect(options: Omit<SshExecOptions, 'commands'>): Promise<SshConnection>;
export declare function createHostVerifier(options: { host: string; port?: number; knownHosts?: string; knownHostsPath?: string; hostCaPath?: string }): HostVerifier;
