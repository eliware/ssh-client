import { expect, test } from "@jest/globals";
import { sshExec } from "../../../src/exec/runner/pipeline/execute.mjs";
import { validateOptions } from "../../../src/exec/options/validation.mjs";

test("validateOptions rejects missing host and commands", () => {
  expect(() => validateOptions({})).toThrow("host and commands[] are required");
});

test("validates every execution option boundary", () => {
  const valid = {
    host: "host",
    port: 22,
    commands: ["run"],
    maxOutput: 1,
    connectTimeout: 1,
    commandTimeout: 0,
    env: { FLAG: true, COUNT: 1, NAME: "value" },
    cwd: "safe/path",
    envFallback: "posix",
  };
  expect(() => validateOptions(valid)).not.toThrow();
  const invalid = [
    [{ ...valid, commands: ["run", 1] }, "commands[]"],
    [{ ...valid, port: 0 }, "port"],
    [{ ...valid, port: 65536 }, "port"],
    [{ ...valid, port: 22.5 }, "port"],
    [{ ...valid, maxOutput: Infinity }, "maxOutput"],
    [{ ...valid, connectTimeout: NaN }, "connectTimeout"],
    [{ ...valid, commandTimeout: -1 }, "commandTimeout"],
    [{ ...valid, env: null }, "env"],
    [{ ...valid, env: "invalid" }, "env"],
    [{ ...valid, env: [] }, "env"],
    [{ ...valid, env: { "BAD-NAME": "value" } }, "env"],
    [{ ...valid, env: { VALID: {} } }, "env"],
    [{ ...valid, cwd: 1 }, "cwd"],
    [{ ...valid, cwd: "bad;path" }, "cwd"],
    [{ ...valid, envFallback: "invalid" }, "envFallback"],
    [{ ...valid, shell: true }, "shell"],
  ];
  for (const [options, message] of invalid) {
    expect(() => validateOptions(options)).toThrow(message);
  }
});

test("validates execution options and cancellation", async () => {
  for (const options of [undefined, { commands: ["echo hi"] }, { host: "localhost" }]) {
    await expect(sshExec(options)).rejects.toThrow("host and commands[] are required");
  }
  await expect(sshExec()).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  await expect(sshExec({ commands: [] })).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  await expect(
    sshExec({
      host: "x",
      commands: [],
      privateKey: "KEY",
      commandTimeout: 0,
      timeout: -1,
      ClientClass: class {},
    }),
  ).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  await expect(
    sshExec({
      host: "x",
      commands: [],
      privateKey: "KEY",
      hostVerifier: "invalid",
      ClientClass: class {},
    }),
  ).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  const controller = new AbortController();
  controller.abort();
  await expect(
    sshExec({
      host: "x",
      commands: [],
      privateKey: "KEY",
      signal: controller.signal,
      ClientClass: class {},
    }),
  ).rejects.toMatchObject({ code: "SSH_CANCELLED" });
});

test("rejects invalid commands, ports, output limits, and execution options", async () => {
  await expect(sshExec({ host: "x", commands: [1], privateKey: "KEY" })).rejects.toMatchObject({
    code: "SSH_INVALID_OPTIONS",
  });
  await expect(
    sshExec({ host: "x", commands: ["ok"], port: 0, privateKey: "KEY" }),
  ).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  await expect(
    sshExec({ host: "x", commands: ["ok", 1], privateKey: "KEY" }),
  ).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  await expect(
    sshExec({ host: "x", commands: ["ok"], maxOutput: 0, privateKey: "KEY" }),
  ).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  await expect(
    sshExec({ host: "x", commands: ["ok"], maxOutput: Infinity, privateKey: "KEY" }),
  ).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  await expect(
    sshExec({ host: "x", commands: ["ok"], connectTimeout: 0, privateKey: "KEY" }),
  ).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  await expect(
    sshExec({ host: "x", commands: ["ok"], commandTimeout: -1, privateKey: "KEY" }),
  ).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  await expect(
    sshExec({ host: "x", commands: ["ok"], cwd: "safe; whoami", privateKey: "KEY" }),
  ).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
});
