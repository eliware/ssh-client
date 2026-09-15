export function readString(buffer, offset) {
  if (offset + 4 > buffer.length) throw new Error('truncated SSH string');
  const length = buffer.readUInt32BE(offset); const start = offset + 4;
  if (start + length > buffer.length) throw new Error('truncated SSH string');
  return { value: buffer.subarray(start, start + length), next: start + length };
}
