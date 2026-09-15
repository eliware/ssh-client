import { fitBytes } from './decode.mjs';

export function appendOutput(state, target, data, maxOutput, getChannel) {
  if (state.truncated) return;
  const bytes = Buffer.from(data); const current = state.stdoutBytes + state.stderrBytes;
  if (current >= maxOutput) { state.truncated = true; getChannel()?.close?.(); return; }
  const remaining = maxOutput - current; const value = fitBytes(bytes, remaining); const consumed = Buffer.byteLength(value);
  state.merged += value;
  if (target === 'stdout') { state.stdout += value; state.stdoutBytes += consumed; } else { state.stderr += value; state.stderrBytes += consumed; }
  if (Buffer.byteLength(value) < bytes.length || bytes.length > remaining) { state.truncated = true; getChannel()?.close?.(); }
}
