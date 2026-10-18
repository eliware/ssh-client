import { readString } from "../encoding/read/string.mjs";

export function readPrincipals(value) {
  const result = [];
  let offset = 0;
  while (offset < value.length) {
    const entry = readString(value, offset);
    result.push(entry.value.toString());
    offset = entry.next;
  }
  return result;
}
