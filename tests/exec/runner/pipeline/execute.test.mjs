import { expect, jest, test } from "@jest/globals";
import { sshExec } from "../../../../src/exec/runner/pipeline/execute.mjs";

test("rejects missing or pre-cancelled execution", async () => {
  await expect(sshExec()).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  const controller = new AbortController();
  controller.abort();
  await expect(sshExec({ signal: controller.signal })).rejects.toMatchObject({
    code: "SSH_CANCELLED",
  });
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

test("aborts an active connection", async () => {
  const controller = new AbortController();
  let markStarted;
  const started = new Promise((resolve) => {
    markStarted = resolve;
  });
  class PendingClient {
    on(event, callback) {
      this.handlers ??= {};
      this.handlers[event] = callback;
      return this;
    }
    connect() {
      markStarted();
    }
    end() {}
  }
  const pending = sshExec({
    host: "router",
    commands: ["true"],
    privateKey: "KEY",
    signal: controller.signal,
    ClientClass: PendingClient,
  });
  await started;
  controller.abort();
  await expect(pending).rejects.toMatchObject({ code: "SSH_CANCELLED" });
});

test("reports a connection timeout", async () => {
  jest.useFakeTimers();
  class PendingClient {
    on() {
      return this;
    }
    connect() {}
    end() {}
  }
  const pending = sshExec({
    host: "router",
    commands: [],
    privateKey: "KEY",
    connectTimeout: 5,
    ClientClass: PendingClient,
  });
  const rejection = expect(pending).rejects.toMatchObject({ code: "SSH_TIMEOUT" });
  await jest.advanceTimersByTimeAsync(5);
  await rejection;
  jest.useRealTimers();
});

test("rejects when the transport setup throws", async () => {
  await expect(
    sshExec({ host: "router", commands: [], privateKey: "KEY", ClientClass: class {} }),
  ).rejects.toMatchObject({ code: "SSH_CONNECTION" });
});
