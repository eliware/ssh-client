export function readString(buffer, offset) {
  if (offset + 4 > buffer.length) throw new Error('truncated SSH string');
  const length = buffer.readUInt32BE(offset); const start = offset + 4;
  if (start + length > buffer.length) throw new Error('truncated SSH string');
  return { value: buffer.subarray(start, start + length), next: start + length };
}
export function encodeString(value) { const result = Buffer.alloc(4 + value.length); result.writeUInt32BE(value.length); value.copy(result, 4); return result; }
export function readUint64(buffer, offset) { if (offset + 8 > buffer.length) throw new Error('truncated SSH integer'); return { value: buffer.readBigUInt64BE(offset), next: offset + 8 }; }
export function readUint32(buffer, offset) { if (offset + 4 > buffer.length) throw new Error('truncated SSH integer'); return { value: buffer.readUInt32BE(offset), next: offset + 4 }; }
