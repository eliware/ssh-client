export function encodeString(value) {
  const result = Buffer.alloc(4 + value.length);
  result.writeUInt32BE(value.length);
  value.copy(result, 4);
  return result;
}
