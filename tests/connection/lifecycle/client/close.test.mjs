import { expect, jest, test } from "@jest/globals";
import { connect } from "../../../../src/connection/lifecycle/client/connect.mjs";
import { closeConnection } from "../../../../src/connection/lifecycle/client/close.mjs";
import { createReusableClientApi } from "../../../../src/connection/lifecycle/client/api.mjs";

test("closeConnection closes its client and updates state", async () => {
  const events = new Map();
  const states = [];
  const client = {
    once: (event, callback) => events.set(event, callback),
    removeListener: () => {},
    end: () => events.get("close")(),
  };
  await expect(closeConnection(client, (state) => states.push(state))).resolves.toBeUndefined();
  expect(states).toEqual(["closing", "closed"]);
});

test("ignores a close event after the first close event", async () => {
  const events = new Map();
  const states = [];
  const client = {
    once: (event, callback) => events.set(event, callback),
    removeListener: () => {},
    end() {
      events.get("close")();
      events.get("error")(Error("late shutdown error"));
    },
  };
  await expect(closeConnection(client, (state) => states.push(state))).resolves.toBeUndefined();
  expect(states).toEqual(["closing", "closed"]);
});

test("close resolves when the transport throws synchronously", async () => {
  class ClosingClient {
    once(event, fn) {
      if (event === "ready") queueMicrotask(fn);
      return this;
    }
    connect() {}
    end() {
      throw new Error("already closed");
    }
    destroy() {}
  }
  const client = await connect({ host: "router", privateKey: "KEY", ClientClass: ClosingClient });
  await expect(client.close()).resolves.toBeUndefined();
  await expect(client.close()).resolves.toBeUndefined();
  await expect(client.exec([])).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  await expect(client.shell()).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  await expect(client.upload({ localPath: "a", remotePath: "b" })).rejects.toMatchObject({
    code: "SSH_CONNECTION",
  });
  await expect(client.download({ remotePath: "a", localPath: "b" })).rejects.toMatchObject({
    code: "SSH_CONNECTION",
  });
});

test("rejects close when the transport emits a shutdown error", async () => {
  class ErrorOnClose {
    once(event, fn) {
      this.handlers ??= {};
      this.handlers[event] = fn;
      if (event === "ready") queueMicrotask(fn);
      return this;
    }
    connect() {}
    end() {
      this.handlers.error(Error("shutdown"));
    }
  }
  const client = await connect({ host: "router", privateKey: "KEY", ClientClass: ErrorOnClose });
  await expect(client.close()).rejects.toMatchObject({
    code: "SSH_CONNECTION",
    context: { operation: "close", phase: "cleanup" },
  });
  expect(client.state).toBe("closed");
});

test("forces close fallback when destroy is unavailable", async () => {
  class StuckClient {
    once(event, callback) {
      if (event === "ready") queueMicrotask(callback);
      return this;
    }
    connect() {}
    end() {}
  }
  const client = await connect({ host: "router", privateKey: "KEY", ClientClass: StuckClient });
  await expect(client.close()).resolves.toBeUndefined();
  expect(client.state).toBe("closed");
});

test("settles close when the transport emits end only", async () => {
  class EndingClient {
    once(event, callback) {
      if (event === "ready") queueMicrotask(callback);
      if (event === "end") this.endCallback = callback;
      return this;
    }
    connect() {}
    end() {
      this.endCallback();
    }
  }
  const client = await connect({
    host: "router",
    username: "user",
    privateKey: "KEY",
    ClientClass: EndingClient,
  });
  await expect(client.close()).resolves.toBeUndefined();
});

test("keeps a failed close result stable when close runs again", async () => {
  const listeners = new Map();
  const client = {
    once: (event, callback) => listeners.set(event, callback),
    removeListener: jest.fn(),
    end: jest.fn(() => listeners.get("error")(Error("shutdown"))),
  };
  const api = createReusableClientApi(client, { host: "router", privateKey: "KEY" });
  const first = api.close();
  const firstError = await first.catch((error) => error);
  expect(firstError).toMatchObject({ code: "SSH_CONNECTION" });
  expect(api.state).toBe("closed");
  await expect(api.close()).rejects.toBe(firstError);
  expect(api.state).toBe("closed");
  expect(client.end).toHaveBeenCalledTimes(1);
});
