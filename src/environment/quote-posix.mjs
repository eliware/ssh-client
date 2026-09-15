export function quotePosix(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}
