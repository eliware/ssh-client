import { quotePosix } from "./posix.mjs";
import { quotePowerShell } from "./powershell.mjs";

export function quoteShell(value, mode = "posix") {
  if (mode === "powershell") return quotePowerShell(value);
  if (mode === "cmd") return `"${String(value).replaceAll('"', '""')}"`;
  return quotePosix(value);
}
