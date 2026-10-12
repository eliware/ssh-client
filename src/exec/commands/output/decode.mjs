export function fitBytes(value, limit) {
  if (!Number.isFinite(limit) || limit < 0) return "";
  const bytes = Buffer.from(value);
  for (let size = Math.min(Math.floor(limit), bytes.length); size >= 0; size -= 1) {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, size));
    } catch {}
  }
}
