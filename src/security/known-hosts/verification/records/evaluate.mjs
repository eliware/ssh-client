import { matchesList } from "../../matching/list.mjs";
import { sameKey } from "../keys.mjs";
import { parseRecordLine, validateRecordFields } from "./parse.mjs";

export function evaluateRecords(text, hosts, actual, cert, utils) {
  const authorities = [];
  const revoked = [];
  let accepted = false;
  for (const line of text.split(/\r?\n/)) {
    const record = parseRecordLine(line);
    if (!record || !matchesList(record.patterns, hosts)) continue;
    const parsed = validateRecordFields(record, utils);
    if (parsed.invalid) return { invalid: true };
    if (record.marker === "@revoked") {
      revoked.push(parsed.keyRecord);
      continue;
    }
    if (record.marker === "@cert-authority") {
      authorities.push(parsed.keyRecord);
      continue;
    }
    if (!record.marked && sameKey(parsed.keyRecord, actual, utils)) accepted = !cert;
  }
  return { accepted, authorities, revoked, invalid: false };
}
