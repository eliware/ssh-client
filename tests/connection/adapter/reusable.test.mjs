import { expect, test } from "@jest/globals";
import { createReusableClientAdapter } from "../../../src/connection/adapter/reusable.mjs";
import { connect } from "../../../src/connection/lifecycle/client/connect.mjs";
test("adapts the transport event and lifecycle methods", () => {
  const calls = [];
  const client = {
    on: (...args) => calls.push(["on", args]),
    removeListener: (...args) => calls.push(["remove", args]),
    once: (...args) => calls.push(["once", args]),
    emit: (...args) => calls.push(["emit", args]),
    end: () => calls.push(["end"]),
    destroy: () => calls.push(["destroy"]),
    exec: (...args) => calls.push(["exec", args]),
    sftp: (...args) => calls.push(["sftp", args]),
  };
  const adapter = createReusableClientAdapter(client);
  expect(adapter.on("a", 1)).toBe(adapter);
  expect(adapter.removeListener("a", 1)).toBe(adapter);
  expect(adapter.once("a", 1)).toBe(adapter);
  expect(adapter.emit("a", 1)).toBe(adapter);
  adapter.connect();
  adapter.end();
  adapter.destroy();
  adapter.exec("x");
  adapter.sftp("x");
  expect(calls.map((call) => call[0])).toEqual([
    "on",
    "remove",
    "once",
    "emit",
    "emit",
    "end",
    "destroy",
    "exec",
    "sftp",
  ]);
});

test("exercises reusable transport adapters and shell completion", async () => {
  class FullClient {
    constructor() {
      this.handlers = {};
    }
    once(event, fn) {
      this.handlers[event] = fn;
      if (event === "ready") queueMicrotask(fn);
      return this;
    }
    on(event, fn) {
      this.handlers[event] = fn;
      return this;
    }
    removeListener(event) {
      delete this.handlers[event];
      return this;
    }
    emit(event, ...args) {
      this.handlers[event]?.(...args);
      return this;
    }
    connect() {}
    end() {
      this.handlers.close?.();
    }
    destroy() {}
    exec(_, callback) {
      callback(null, {
        on(event, fn) {
          if (event === "close") queueMicrotask(() => fn(0));
          return this;
        },
        stderr: {
          on() {
            return this;
          },
        },
      });
    }
    shell(callback) {
      callback(null, {
        on() {
          return this;
        },
        once(event, fn) {
          if (event === "close") queueMicrotask(() => fn(0));
          return this;
        },
        close() {},
        end() {},
      });
    }
  }
  const client = await connect({ host: "router", privateKey: "KEY", ClientClass: FullClient });
  await expect(client.exec(["true"], { timeout: 100 })).resolves.toHaveLength(1);
  const shell = await client.shell();
  await expect(shell.completion).resolves.toMatchObject({ code: 0 });
  shell.close();
  await client.close();
});
