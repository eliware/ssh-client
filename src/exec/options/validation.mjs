import { SshError } from "../../errors.mjs";

export function validateOptions({
  host,
  port,
  commands,
  maxOutput,
  cwd,
  connectTimeout,
  commandTimeout,
  env,
  envFallback,
  shell,
}) {
  if (!host || !Array.isArray(commands))
    throw new SshError("host and commands[] are required", "SSH_INVALID_OPTIONS");
  if (!commands.every((command) => typeof command === "string"))
    throw new SshError("commands[] must contain only strings", "SSH_INVALID_OPTIONS");
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new SshError("TCP endpoint number must be valid", "SSH_INVALID_OPTIONS");
  if (!Number.isFinite(maxOutput) || maxOutput <= 0)
    throw new SshError("maxOutput must be a positive number", "SSH_INVALID_OPTIONS");
  if (!Number.isFinite(connectTimeout) || connectTimeout <= 0)
    throw new SshError("connectTimeout must be positive", "SSH_INVALID_OPTIONS");
  if (!Number.isFinite(commandTimeout) || commandTimeout < 0)
    throw new SshError("commandTimeout must be non-negative", "SSH_INVALID_OPTIONS");
  if (
    env !== undefined &&
    (!env ||
      typeof env !== "object" ||
      Array.isArray(env) ||
      !Object.entries(env).every(
        ([name, value]) =>
          /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) &&
          (typeof value === "string" || typeof value === "number" || typeof value === "boolean"),
      ))
  )
    throw new SshError(
      "env must contain valid variable names and scalar values",
      "SSH_INVALID_OPTIONS",
    );
  if (cwd !== undefined && (typeof cwd !== "string" || !/^[A-Za-z0-9_ ./\\:-]+$/.test(cwd)))
    throw new SshError("cwd contains unsupported shell characters", "SSH_INVALID_OPTIONS");
  if (envFallback !== undefined && !["posix", "powershell", "cmd"].includes(envFallback))
    throw new SshError("envFallback must be posix, powershell, or cmd", "SSH_INVALID_OPTIONS");
  if (shell)
    throw new SshError(
      "sshExec does not support shell. Use connect().shell() to open a shell.",
      "SSH_INVALID_OPTIONS",
    );
}
