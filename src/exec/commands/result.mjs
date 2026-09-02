import { fitBytes } from './output/decode.mjs';

export function createCommandResult({ command, stdout, stderr, merged, maxOutput, truncated, exitCode, closeCode, exitSignal, closeSignal, started }) {
  const signal = exitSignal ?? closeSignal;
  return {
    command,
    stdout,
    stderr,
    result: fitBytes(Buffer.from(merged), maxOutput),
    truncated,
    code: exitCode ?? closeCode ?? null,
    signal: signal === undefined ? undefined : String(signal),
    duration: Date.now() - started,
  };
}
