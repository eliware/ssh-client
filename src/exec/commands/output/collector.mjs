import { fitBytes } from './decode.mjs';

export function createOutputCollector(maxOutput, getChannel) {
  let stdout = '';
  let stderr = '';
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let merged = '';
  let truncated = false;
  const add = (target, data) => {
    if (truncated) return;
    const bytes = Buffer.from(data);
    const current = stdoutBytes + stderrBytes;
    if (current >= maxOutput) { truncated = true; getChannel()?.close?.(); return; }
    const remaining = maxOutput - current;
    const value = fitBytes(bytes, remaining);
    const consumed = Buffer.byteLength(value);
    merged += value;
    if (target === 'stdout') { stdout += value; stdoutBytes += consumed; } else { stderr += value; stderrBytes += consumed; }
    if (Buffer.byteLength(value) < bytes.length || bytes.length > remaining) { truncated = true; getChannel()?.close?.(); }
  };
  return { add, get stdout() { return stdout; }, get stderr() { return stderr; }, get merged() { return merged; }, get truncated() { return truncated; } };
}
