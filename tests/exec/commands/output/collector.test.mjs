import { expect, jest, test } from "@jest/globals";
import { createOutputCollector } from "../../../../src/exec/commands/output/collector.mjs";
import { sshExec } from "../../../../src/exec/runner/pipeline/execute.mjs";

test("collects stdout and stderr up to the byte limit", () => {
  const close = jest.fn();
  const output = createOutputCollector(4, () => ({ close }));
  output.add("stdout", "ab");
  output.add("stderr", "cd");
  output.add("stdout", "late");
  expect(output.stdout).toBe("ab");
  expect(output.stderr).toBe("cd");
  expect(output.merged).toBe("abcd");
  expect(output.truncated).toBe(true);
  expect(close).toHaveBeenCalled();
});
test("caps pipeline output at maxOutput", async () => {
  class ClientMock {
    on(event, cb) {
      if (event === "ready") this.ready = cb;
      return this;
    }
    connect() {
      this.ready();
      return this;
    }
    exec(_command, cb) {
      const stream = {
        on(event, handler) {
          if (event === "data") {
            handler("123456");
            handler("abcdef");
          }
          if (event === "close") handler(0);
          return this;
        },
        stderr: {
          on(event, handler) {
            if (event === "data") handler("abcdef");
            return this;
          },
        },
      };
      cb(null, stream);
    }
    end() {}
  }
  const [result] = await sshExec({
    host: "x",
    commands: ["out"],
    privateKey: "KEY",
    maxOutput: 4,
    ClientClass: ClientMock,
  });
  expect(result.result.length).toBeLessThanOrEqual(4);
});
test("covers channel output limits and stderr failures", async () => {
  let streamHandlers;
  let stderrHandlers;
  let callback;
  class BranchClient {
    on(event, fn) {
      this.handlers ??= {};
      this.handlers[event] = fn;
      return this;
    }
    connect() {
      this.handlers.ready();
    }
    end() {}
    exec(_, cb) {
      callback = cb;
      streamHandlers = {};
      stderrHandlers = {};
      cb(null, {
        on(event, fn) {
          streamHandlers[event] = fn;
          return this;
        },
        stderr: {
          on(event, fn) {
            stderrHandlers[event] = fn;
            return this;
          },
        },
        close: jest.fn(),
      });
    }
  }
  const running = sshExec({
    host: "x",
    commands: ["x"],
    privateKey: "KEY",
    maxOutput: 1,
    ClientClass: BranchClient,
  });
  await new Promise((resolve) => setImmediate(resolve));
  streamHandlers.data(Buffer.from("x"));
  streamHandlers.data(Buffer.from("late"));
  streamHandlers.close();
  await expect(running).resolves.toMatchObject([{ truncated: true }]);
  const failed = sshExec({
    host: "x",
    commands: ["x"],
    privateKey: "KEY",
    ClientClass: BranchClient,
  });
  await new Promise((resolve) => setImmediate(resolve));
  stderrHandlers.error({});
  await expect(failed).rejects.toMatchObject({ code: "SSH_EXEC" });
  callback?.(null, { close: jest.fn() });
});

test("closes the active channel when a value exceeds the limit", () => {
  const close = jest.fn();
  const output = createOutputCollector(3, () => ({ close }));
  output.add("stdout", "abcdef");
  expect(output.stdout).toBe("abc");
  expect(output.truncated).toBe(true);
  expect(close).toHaveBeenCalledTimes(1);
});
