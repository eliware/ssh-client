import { expect, test } from "@jest/globals";
import { buildCommand } from "../../../../src/exec/commands/environment/command.mjs";
import { sshExec } from "../../../../src/exec/runner/pipeline/execute.mjs";

test("builds commands with environment fallbacks and safe quoting", () => {
  expect(buildCommand("run", { env: { KNIT_TEST: "a'b" }, envFallback: "posix" })).toContain(
    "export KNIT_TEST='a'\\''b'; run",
  );
  expect(
    buildCommand("run", {
      cwd: "C:\\temp\\dir",
      env: { KNIT_TEST: "yes" },
      envFallback: "powershell",
    }),
  ).toBe("$env:KNIT_TEST='yes'; Set-Location 'C:\\temp\\dir'; run");
  expect(buildCommand("run", { cwd: "/tmp" })).toBe("cd '/tmp' && run");
  expect(buildCommand("run", { cwd: "C:\\temp", envFallback: "cmd" })).toContain(
    'cd /d "C:\\temp"',
  );
});
test("forwards environment requests without shell fallback", async () => {
  let options;
  class EnvironmentClient {
    on(event, fn) {
      if (event === "ready") this.ready = fn;
      return this;
    }
    connect() {
      this.ready();
    }
    end() {}
    exec(_, args, callback) {
      options = args;
      callback(null, {
        on(event, fn) {
          if (event === "close") fn(0);
          return this;
        },
        stderr: {
          on() {
            return this;
          },
        },
      });
    }
  }
  await expect(
    sshExec({
      host: "x",
      commands: ["env"],
      env: { TEST_VALUE: "yes" },
      privateKey: "KEY",
      ClientClass: EnvironmentClient,
    }),
  ).resolves.toHaveLength(1);
  expect(options).toEqual({ env: { TEST_VALUE: "yes" }, pty: false });
});
