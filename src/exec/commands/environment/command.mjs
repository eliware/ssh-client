import { renderEnvironment } from "../../../environment/render-environment.mjs";
import { quoteShell } from "../../../environment/quote-shell.mjs";

export function buildCommand(command, { cwd, env, envFallback }) {
  const directory =
    cwd === undefined
      ? ""
      : `${envFallback === "powershell" ? "Set-Location" : envFallback === "cmd" ? "cd /d" : "cd"} ${quoteShell(cwd, envFallback || "posix")}`;
  return renderEnvironment(
    cwd !== undefined ? `${directory} && ${command}` : command,
    env,
    envFallback,
  );
}
