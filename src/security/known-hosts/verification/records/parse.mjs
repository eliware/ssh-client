export function parseRecordLine(line) {
  const fields = line.trim().split(/\s+/);
  const first = fields[0];
  if (!first || first.startsWith("#")) return undefined;
  const marked = first.startsWith("@");
  const patternField = marked ? fields[1] : first;
  if (!patternField) return undefined;
  return {
    fields,
    marker: marked ? first : "",
    marked,
    patterns: patternField.split(","),
  };
}

export function validateRecordFields(record, utils) {
  const { fields, marker, marked } = record;
  if (marked) {
    if (fields.length < 4) return { invalid: true };
    if (!["@revoked", "@cert-authority"].includes(marker)) return { invalid: true };
    const keyRecord = `${fields[2]} ${fields[3]}`;
    try {
      if (!utils.parseKey(keyRecord)?.getPublicSSH?.()) return { invalid: true };
    } catch {
      return { invalid: true };
    }
    return { invalid: false, keyRecord };
  }
  if (fields.length < 3) return { invalid: true };
  return { invalid: false, keyRecord: `${fields[1]} ${fields[2]}` };
}
