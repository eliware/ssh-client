export type HostVerifier = (key: Buffer, verify?: (ok: boolean) => void) => boolean | void | Promise<boolean>;
export interface SshExecOptions { host: string; port?: number; username?: string; commands: string[]; privateKey?: string; privateKeyPath?: string; passphrase?: string; password?: string; agent?: string; hostVerifier?: HostVerifier; knownHosts?: string; knownHostsPath?: string; hostCaPath?: string; connectTimeout?: number; commandTimeout?: number; timeout?: number; signal?: AbortSignal; maxOutput?: number; cwd?: string; env?: Record<string, string | number | boolean>; envFallback?: 'posix' | 'powershell' | 'cmd'; pty?: boolean; keepAlive?: boolean; ClientClass?: any; fsLib?: any; homedirFn?: () => string; }
export interface SshExecResult { command: string; stdout: string; stderr: string; result: string; truncated: boolean; code: number | null; signal?: string; duration: number; }
export interface UploadOptions { localPath: string; remotePath: string; mode?: number; signal?: AbortSignal; timeout?: number; }
export interface DownloadOptions { remotePath: string; localPath: string; signal?: AbortSignal; timeout?: number; }
export interface ShellSession extends NodeJS.ReadWriteStream { close(): void; completion: Promise<{ code: number | null; signal?: string }>; }
export interface SshConnection { readonly state: 'open' | 'closing' | 'closed'; exec(commands: string[], options?: { signal?: AbortSignal; timeout?: number; commandTimeout?: number; cwd?: string; env?: Record<string, string | number | boolean>; envFallback?: 'posix' | 'powershell' | 'cmd'; pty?: boolean }): Promise<SshExecResult[]>; shell(options?: { onData?: (data: Buffer) => void; onInput?: (stream: ShellSession) => void; signal?: AbortSignal; timeout?: number }): Promise<ShellSession>; upload(options: UploadOptions): Promise<void>; download(options: DownloadOptions): Promise<void>; close(): Promise<void>; }
export class SshError extends Error { code: string; cause?: unknown; context: { operation: string; phase: string; [key: string]: unknown }; }
export declare function sshExec(options: SshExecOptions): Promise<SshExecResult[]>;
export declare function connect(options: Omit<SshExecOptions, 'commands'>): Promise<SshConnection>;
export declare function createHostVerifier(options: { host: string; port?: number; knownHosts?: string; knownHostsPath?: string; hostCaPath?: string }): HostVerifier;
export declare function loadKey(options?: { privateKey?: string; privateKeyPath?: string; passphrase?: string; fsLib?: any; homedirFn?: () => string }): Promise<string | undefined>;
export declare function expandPath(value: string, homedirFn?: () => string): string;
export declare function upload(options: UploadOptions & { ClientClass?: any }): Promise<void>;
export declare function download(options: DownloadOptions & { ClientClass?: any }): Promise<void>;
