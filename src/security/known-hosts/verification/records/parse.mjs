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
