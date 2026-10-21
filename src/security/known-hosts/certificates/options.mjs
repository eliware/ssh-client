import { readString } from "../encoding/read/string.mjs";

export function validateCertificateOptions(critical, extensions) {
  for (const [field, label] of [
    [critical, "options"],
    [extensions, "extensions"],
  ]) {
    let offset = 0;
    const names = new Set();
    while (offset < field.length) {
      const name = readString(field, offset);
      offset = name.next;
      const value = readString(field, offset);
      offset = value.next;
      const text = name.value.toString();
      if (!text || names.has(text)) throw new Error("invalid host certificate options");
      names.add(text);
    }
    if (field.length) throw new Error(`unsupported host certificate ${label}`);
  }
}
