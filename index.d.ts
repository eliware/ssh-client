export interface SshExecOptions {
  host: string;
  port?: number;
  username?: string;
  commands: string[];
  ClientClass?: any; // for testing/mocking
  fsLib?: typeof import('fs').promises;
  homedirFn?: () => string;
}

export interface SshExecResult {
  result: string;
  code: number;
}

/**
 * Execute commands on a remote SSH server using private key authentication only.
 * @param options SshExecOptions
 * @returns Promise<SshExecResult[]>
 */
export declare function sshExec(options: SshExecOptions): Promise<SshExecResult[]>;
