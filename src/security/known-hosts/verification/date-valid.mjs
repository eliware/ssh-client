export function dateValid(value, now = new Date()) {
  if (!value) return false;
  const date = Date.parse(value);
  return Number.isFinite(date) && date <= now.getTime();
}
