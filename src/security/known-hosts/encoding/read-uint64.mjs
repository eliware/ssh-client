export function readUint64(buffer, offset) {
  if (offset + 8 > buffer.length) throw new Error('truncated SSH integer');
  return { value: buffer.readBigUInt64BE(offset), next: offset + 8 };
}
