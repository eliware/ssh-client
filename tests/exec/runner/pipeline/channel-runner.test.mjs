import { expect, jest, test } from "@jest/globals";
import { runCommand } from "../../../../src/exec/runner/pipeline/channel-runner.mjs";

test("runs a command channel and records its result", async () => {
  const handlers = {};
  const next = jest.fn();
  const stream = {
    on(event, handler) {
      handlers[event] = handler;
      return this;
    },
    stderr: {
      on() {
        return this;
      },
    },
    close: jest.fn(),
  };
  const conn = { exec: (_command, callback) => callback(null, stream), end: jest.fn() };
  const context = {
    maxOutput: 100,
    commandTimeout: 0,
    keepAlive: false,
    conn,
    cwd: undefined,
    env: undefined,
    envFallback: undefined,
    pty: false,
    results: [],
    setCommandStarting: jest.fn(),
    setActiveTimer: jest.fn(),
    clearActiveTimer: jest.fn(),
    isSettled: () => false,
    finish: jest.fn(),
  };
  runCommand(context, "echo ok", next);
  handlers.data("ok");
  handlers.exit(0);
  handlers.close(0);
  await new Promise((resolve) => setImmediate(resolve));
  expect(context.results[0]).toMatchObject({ command: "echo ok", stdout: "ok", code: 0 });
  expect(next).toHaveBeenCalledTimes(1);
});
test("reports stderr failures and clears the active timer", () => {
  const handlers = {};
  const finish = jest.fn();
  const context = {
    maxOutput: 100,
    commandTimeout: 0,
    keepAlive: false,
    conn: {
      exec: (_command, callback) =>
        callback(null, {
          on(event, handler) {
            handlers[event] = handler;
            return this;
          },
          stderr: {
            on(event, handler) {
              handlers[`stderr:${event}`] = handler;
              return this;
            },
          },
        }),
    },
    cwd: undefined,
    env: undefined,
    envFallback: undefined,
    pty: false,
    results: [],
    setCommandStarting: jest.fn(),
    setActiveTimer: jest.fn(),
    clearActiveTimer: jest.fn(),
    isSettled: () => false,
    finish,
  };
  runCommand(context, "echo fail", jest.fn());
  handlers["stderr:error"](Error("stderr"));
  handlers["stderr:error"](Error("late stderr"));
  expect(finish).toHaveBeenCalledWith(expect.objectContaining({ code: "SSH_EXEC" }));
});

test("clears a timer when the command timeout completes synchronously", async () => {
  jest.useFakeTimers();
  const context = {
    maxOutput: 100,
    commandTimeout: 0,
    keepAlive: false,
    conn: {
      exec(_command, callback) {
        callback(null, {
          on(event, handler) {
            if (event === "close") handler(0);
            return this;
          },
          stderr: {
            on() {
              return this;
            },
          },
        });
      },
    },
    cwd: undefined,
    env: undefined,
    envFallback: undefined,
    pty: false,
    results: [],
    setCommandStarting: jest.fn(),
    setActiveTimer: jest.fn(),
    clearActiveTimer: jest.fn(),
    isSettled: () => false,
    finish: jest.fn(),
  };
  runCommand(context, "echo timeout", jest.fn());
  await Promise.resolve();
  expect(context.clearActiveTimer).toHaveBeenCalled();
  jest.useRealTimers();
});

test("clears the timer after a synchronous channel error", () => {
  const context = {
    maxOutput: 100,
    commandTimeout: 0,
    keepAlive: false,
    conn: {
      exec(_command, callback) {
        callback(null, {
          on(event, handler) {
            if (event === "error") handler(Error("channel"));
            return this;
          },
          stderr: {
            on() {
              return this;
            },
          },
        });
      },
    },
    cwd: undefined,
    env: undefined,
    envFallback: undefined,
    pty: false,
    results: [],
    setCommandStarting: jest.fn(),
    setActiveTimer: jest.fn(),
    clearActiveTimer: jest.fn(),
    isSettled: () => false,
    finish: jest.fn(),
  };
  runCommand(context, "echo error", jest.fn());
  expect(context.finish).toHaveBeenCalledWith(expect.objectContaining({ code: "SSH_EXEC" }));
});
