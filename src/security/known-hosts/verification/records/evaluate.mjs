import { matchesList } from "../../matching/list.mjs";
import { sameKey } from "../keys.mjs";

export function evaluateRecords(text, hosts, actual, cert, utils) {
  const authorities = [];
  const revoked = [];
  let accepted = false;
  for (const line of text.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/);
    const first = fields[0];
    if (!first || first.startsWith("#")) continue;
    const marked = first.startsWith("@");
    const patternField = marked ? fields[1] : first;
    if (!patternField) continue;
    const patterns = patternField.split(",");
    if (!matchesList(patterns, hosts)) continue;
    const marker = marked ? first : "";
    if (marked) {
      if (fields.length < 4) return { invalid: true };
      if (!["@revoked", "@cert-authority"].includes(marker)) return { invalid: true };
    }
    const record = marked ? `${fields[2]} ${fields[3]}` : "";
    if (marked) {
      try {
        if (!utils.parseKey(record)?.getPublicSSH?.()) return { invalid: true };
      } catch {
        return { invalid: true };
      }
    }
    if (fields.length < 3) return { invalid: true };
    const keyRecord = marked ? record : `${fields[1]} ${fields[2]}`;
    if (marker === "@revoked") {
      revoked.push(keyRecord);
      continue;
    }
    if (marker === "@cert-authority") {
      authorities.push(keyRecord);
      continue;
    }
    if (sameKey(keyRecord, actual, utils)) accepted = !cert;
  }
  return { accepted, authorities, revoked, invalid: false };
}
