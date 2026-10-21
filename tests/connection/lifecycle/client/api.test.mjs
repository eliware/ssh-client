import { expect, jest, test } from "@jest/globals";
import { EventEmitter } from "node:events";
import { createReusableClientApi } from "../../../../src/connection/lifecycle/client/api.mjs";

test("exposes open state and rejects operations after close", async () => {
  const client = {
    end: jest.fn(() => {
      throw Error("closed");
    }),
    once: jest.fn(),
  };
  const api = createReusableClientApi(client, { host: "router", privateKey: "KEY" });
  expect(api.state).toBe("open");
  expect(typeof api.exec).toBe("function");
  expect(typeof api.shell).toBe("function");
  expect(typeof api.upload).toBe("function");
  expect(typeof api.download).toBe("function");
  expect(typeof api.close).toBe("function");
  await expect(api.close()).resolves.toBeUndefined();
  await expect(api.close()).resolves.toBeUndefined();
  await expect(api.exec([])).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  await expect(api.shell()).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  await expect(api.upload({ localPath: "a", remotePath: "b" })).rejects.toMatchObject({
    code: "SSH_CONNECTION",
  });
  await expect(api.download({ remotePath: "a", localPath: "b" })).rejects.toMatchObject({
    code: "SSH_CONNECTION",
  });
});

test("marks the reusable API closed when its transport closes", () => {
  const client = new EventEmitter();
  const api = createReusableClientApi(client, { host: "router", privateKey: "KEY" });
  expect(api.state).toBe("open");
  client.emit("close");
  expect(api.state).toBe("closed");
});

test("marks the reusable API closed when its transport emits an error", () => {
  const client = new EventEmitter();
  const api = createReusableClientApi(client, { host: "router", privateKey: "KEY" });
  client.emit("error", Error("transport failed"));
  expect(api.state).toBe("closed");
});

test("closes the reusable API when shell setup times out", async () => {
  const client = { end: jest.fn(), shell() {} };
  const api = createReusableClientApi(client, { host: "router", privateKey: "KEY" });
  await expect(api.shell({ timeout: 1 })).rejects.toMatchObject({ code: "SSH_TIMEOUT" });
  expect(api.state).toBe("closed");
});

test("closes the transport after an open shell stream fails", async () => {
  const client = new EventEmitter();
  const stream = new EventEmitter();
  client.shell = (callback) => callback(null, stream);
  client.end = jest.fn(() => client.emit("close"));
  stream.close = jest.fn();
  stream.end = jest.fn();
  const api = createReusableClientApi(client, { host: "router", privateKey: "KEY" });
  const session = await api.shell();
  const failed = expect(session.completion).rejects.toMatchObject({ code: "SSH_SHELL" });
  stream.emit("error", Error("shell failed"));
  await failed;
  expect(api.state).toBe("closed");
  expect(client.end).toHaveBeenCalledTimes(1);
});

test("closes the reusable API when an execution times out", async () => {
  const client = {
    on(event, handler) {
      if (event === "ready") this.ready = handler;
      return this;
    },
    once(event, handler) {
      if (event === "ready") this.ready = handler;
      return this;
    },
    emit(event) {
      if (event === "ready") this.ready?.();
      return this;
    },
    connect() {
      this.ready();
    },
    end: jest.fn(),
    exec() {},
  };
  const api = createReusableClientApi(client, { host: "router", privateKey: "KEY" });
  await expect(api.exec(["run"], { commandTimeout: 1 })).rejects.toMatchObject({
    code: "SSH_COMMAND_TIMEOUT",
  });
  expect(api.state).toBe("closed");
});

test("rejects queued work after close begins", async () => {
  let release;
  const client = {
    end: jest.fn(),
    once(event, callback) {
      if (event === "close") this.close = callback;
      return this;
    },
    sftp(callback) {
      release = callback;
    },
  };
  const api = createReusableClientApi(client, { host: "router", privateKey: "KEY" });
  const first = api.upload({ localPath: "a", remotePath: "b" });
  const second = api.upload({ localPath: "c", remotePath: "d" });
  const queuedExec = api.exec(["echo queued"]);
  const queuedDownload = api.download({ remotePath: "c", localPath: "d" });
  const closing = api.close();
  release?.(new Error("late"), undefined);
  await expect(first).rejects.toBeDefined();
  await expect(second).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  await expect(queuedExec).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  await expect(queuedDownload).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  client.close?.();
  await closing.catch(() => {});
});
