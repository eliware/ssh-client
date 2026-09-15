export function quotePowerShell(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
