import { expect, test, jest } from "@jest/globals";
import { startExecutionConnection } from "../../../../src/exec/runner/pipeline/connection.mjs";
import { sshExec } from "../../../../src/exec/runner/pipeline/execute.mjs";

test("starts an execution connection and forwards configuration", async () => {
  let options;
  class Client {
    on(event, handler) {
      this[event] = handler;
      return this;
    }
    connect(value) {
      options = value;
      this.ready();
    }
  }
  const connection = startExecutionConnection(
    {
      ClientClass: Client,
      host: "router",
      port: 22,
      username: "user",
      key: "KEY",
      connectTimeout: 1000,
    },
    { onReady() {}, onError() {}, onClosed() {}, onTimeout() {}, onConnectError() {} },
  );
  connection.connect();
  expect(connection.conn).toBeInstanceOf(Client);
  expect(options).toMatchObject({ host: "router", privateKey: "KEY" });
  clearTimeout(connection.timer);
});

test("reports synchronous connect failures", async () => {
  class Client {
    on() {
      return this;
    }
    connect() {
      throw Error("connect");
    }
  }
  const onConnectError = jest.fn();
  const connection = startExecutionConnection(
    { ClientClass: Client, connectTimeout: 1000 },
    { onReady() {}, onError() {}, onClosed() {}, onTimeout() {}, onConnectError },
  );
  connection.connect();
  expect(onConnectError).toHaveBeenCalledWith(expect.objectContaining({ code: "SSH_CONNECTION" }));
  clearTimeout(connection.timer);
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

test("reports an execution connection timeout", async () => {
  jest.useFakeTimers();
  try {
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
  } finally {
    jest.useRealTimers();
  }
});

test("rejects when execution transport setup throws", async () => {
  await expect(
    sshExec({ host: "router", commands: [], privateKey: "KEY", ClientClass: class {} }),
  ).rejects.toMatchObject({ code: "SSH_CONNECTION" });
});
