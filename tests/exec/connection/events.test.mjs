import { expect, jest, test } from "@jest/globals";
import { attachConnectionEvents } from "../../../src/exec/connection/events.mjs";
import { sshExec } from "../../../src/exec/runner/pipeline/execute.mjs";

test("attaches ready, error, end, and close handlers", () => {
  const calls = [];
  const removals = [];
  const client = {
    on(event, handler) {
      calls.push([event, handler]);
      return this;
    },
    removeListener(event, handler) {
      removals.push([event, handler]);
      return this;
    },
  };
  const handlers = { onReady: jest.fn(), onError: jest.fn(), onClosed: jest.fn() };
  const detach = attachConnectionEvents(client, handlers);
  expect(detach).toEqual(expect.any(Function));
  expect(calls.map(([event]) => event)).toEqual(["ready", "error", "end", "close"]);
  expect(calls[0][1]).toBe(handlers.onReady);
  expect(calls[1][1]).toBe(handlers.onError);
  expect(calls[2][1]).toBe(handlers.onClosed);
  expect(calls[3][1]).toBe(handlers.onClosed);
  detach();
  expect(removals).toEqual(calls);
});
test("handles settled stream and transport events", async () => {
  let error;
  class CompletedClient {
    on(event, fn) {
      if (event === "ready") this.ready = fn;
      return this;
    }
    connect() {
      this.ready();
    }
    end() {}
    exec(_, callback) {
      callback(null, {
        on(event, fn) {
          if (event === "close") fn(0);
          if (event === "error") error = fn;
          return this;
        },
      });
    }
  }
  await expect(
    sshExec({ host: "x", commands: ["x"], privateKey: "KEY", ClientClass: CompletedClient }),
  ).resolves.toHaveLength(1);
  error?.(Error("late stream error"));
  let connection;
  class SettledClient {
    constructor() {
      connection = this;
    }
    on(event, fn) {
      this.handlers ??= {};
      this.handlers[event] = fn;
      return this;
    }
    connect() {
      this.handlers.ready();
    }
    end() {}
  }
  await expect(
    sshExec({ host: "x", commands: [], privateKey: "KEY", ClientClass: SettledClient }),
  ).resolves.toEqual([]);
  connection.handlers.error({ level: "other", message: "late" });
  class NeverReady {
    on() {
      return this;
    }
    connect() {}
    end() {}
  }
  await expect(
    sshExec({
      host: "x",
      commands: [],
      privateKey: "KEY",
      connectTimeout: 1,
      ClientClass: NeverReady,
    }),
  ).rejects.toMatchObject({ code: "SSH_TIMEOUT" });
});
test("ignores duplicate ready notifications and destroys failed cleanup", async () => {
  class DuplicateReady {
    on(event, fn) {
      if (event === "ready") this.ready = fn;
      return this;
    }
    connect() {
      this.ready();
      this.ready();
    }
    end() {}
  }
  await expect(
    sshExec({ host: "x", commands: [], privateKey: "KEY", ClientClass: DuplicateReady }),
  ).resolves.toEqual([]);
  class FailedCleanup {
    on(event, fn) {
      if (event === "ready") this.ready = fn;
      return this;
    }
    connect() {
      this.ready();
    }
    end() {
      throw Error("already closed");
    }
    destroy = jest.fn();
    exec() {
      throw Error("exec");
    }
  }
  await expect(
    sshExec({ host: "x", commands: ["x"], privateKey: "KEY", ClientClass: FailedCleanup }),
  ).rejects.toMatchObject({ code: "SSH_EXEC" });
});
test("ends the transport when execution fails before cleanup", async () => {
  class ErrorClient {
    on(event, fn) {
      if (event === "ready") this.ready = fn;
      return this;
    }
    connect() {
      this.ready();
    }
    end = jest.fn();
    exec(_, callback) {
      callback(Error("exec"));
    }
  }
  const client = new ErrorClient();
  await expect(
    sshExec({
      host: "x",
      commands: ["x"],
      privateKey: "KEY",
      keepAlive: false,
      ClientClass: class extends ErrorClient {
        constructor() {
          super();
          client.end = this.end;
        }
      },
    }),
  ).rejects.toMatchObject({ code: "SSH_EXEC" });
  expect(client.end).toHaveBeenCalled();
});
test("ignores a repeated connection close after settlement", async () => {
  class DoubleClose {
    on(event, fn) {
      this.handlers ??= {};
      this.handlers[event] = fn;
      return this;
    }
    connect() {
      this.handlers.ready();
    }
    end() {}
    exec() {
      this.handlers.close();
      this.handlers.close();
    }
  }
  await expect(
    sshExec({ host: "x", commands: ["x"], privateKey: "KEY", ClientClass: DoubleClose }),
  ).rejects.toMatchObject({ code: "SSH_CONNECTION" });
});
