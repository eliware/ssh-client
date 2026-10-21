import { expect, test } from "@jest/globals";
import { connect } from "../../../src/connection/lifecycle/client/connect.mjs";

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
