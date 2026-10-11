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
    const patterns = (marked ? fields[1] : first).split(",");
    if (fields.length < (marked ? 4 : 3)) return { invalid: true };
    const marker = marked ? first : "";
    if (marked && !["@revoked", "@cert-authority"].includes(marker)) return { invalid: true };
    const record = `${marked ? fields[2] : fields[1]} ${marked ? fields[3] : fields[2]}`;
    if (marked) {
      try {
        if (!utils.parseKey(record)?.getPublicSSH?.()) return { invalid: true };
      } catch {
        return { invalid: true };
      }
    }
    if (marker === "@revoked") {
      if (matchesList(patterns, hosts)) revoked.push(record);
      continue;
    }
    if (marker === "@cert-authority") {
      if (matchesList(patterns, hosts)) authorities.push(record);
      continue;
    }
    if (matchesList(patterns, hosts) && sameKey(record, actual, utils)) accepted = !cert;
  }
  return { accepted, authorities, revoked, invalid: false };
}
