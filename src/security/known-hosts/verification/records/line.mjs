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
