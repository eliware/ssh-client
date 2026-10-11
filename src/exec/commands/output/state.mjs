export function createOutputState() {
  return { stdout: "", stderr: "", merged: "", stdoutBytes: 0, stderrBytes: 0, truncated: false };
}
