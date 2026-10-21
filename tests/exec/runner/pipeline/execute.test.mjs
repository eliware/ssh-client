import { expect, jest, test } from "@jest/globals";
import { EventEmitter } from "node:events";
import { sshExec } from "../../../../src/exec/runner/pipeline/execute.mjs";

test("rejects execution without options", async () => {
  await expect(sshExec()).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
});

test("returns output from a mocked SSH command", async () => {
  class Client {
    on(event, callback) {
      this.handlers ??= {};
      this.handlers[event] = callback;
      return this;
    }
    connect() {
      this.handlers.ready();
      this.handlers.ready();
    }
    end() {}
    exec(_command, callback) {
      callback(null, {
        on(event, handler) {
          if (event === "data") handler("ok");
          if (event === "close") handler(0);
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
    sshExec({ host: "router", commands: ["true"], privateKey: "KEY", ClientClass: Client }),
  ).resolves.toMatchObject([{ stdout: "ok", code: 0 }]);
});

test("caps pipeline output at maxOutput", async () => {
  class ClientMock {
    on(event, callback) {
      if (event === "ready") this.ready = callback;
      return this;
    }
    connect() {
      this.ready();
      return this;
    }
    exec(_command, callback) {
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
      callback(null, stream);
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

test("returns a partial result when the output limit closes a silent channel", async () => {
  class ClientMock {
    on(event, callback) {
      if (event === "ready") this.ready = callback;
      return this;
    }
    connect() {
      this.ready();
      return this;
    }
    exec(_command, callback) {
      const stream = new EventEmitter();
      stream.stderr = new EventEmitter();
      stream.close = jest.fn();
      callback(null, stream);
      stream.emit("data", "12345");
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
  expect(result).toMatchObject({ stdout: "1234", truncated: true, code: null });
});

test("covers channel output limits and stderr failures", async () => {
  jest.useFakeTimers();
  try {
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
    await jest.runAllTimersAsync();
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
    await jest.runAllTimersAsync();
    stderrHandlers.error({});
    await expect(failed).rejects.toMatchObject({ code: "SSH_EXEC" });
    callback?.(null, { close: jest.fn() });
  } finally {
    jest.useRealTimers();
  }
});

test("loads a private key path for an execution", async () => {
  const fsLib = { readFile: jest.fn().mockResolvedValue("KEY") };
  class Client {
    on(event, callback) {
      if (event === "ready") this.ready = callback;
      return this;
    }
    connect() {
      this.ready();
    }
    end() {}
  }
  await expect(
    sshExec({
      host: "router",
      commands: [],
      privateKeyPath: "/key",
      fsLib,
      ClientClass: Client,
    }),
  ).resolves.toEqual([]);
  expect(fsLib.readFile).toHaveBeenCalledWith("/key", "utf8");
});
