export function readUint32(buffer, offset) {
  if (offset + 4 > buffer.length) throw new Error('truncated SSH integer');
  return { value: buffer.readUInt32BE(offset), next: offset + 4 };
}
