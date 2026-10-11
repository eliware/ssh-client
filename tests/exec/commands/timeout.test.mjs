import { expect, jest, test } from "@jest/globals";
import { sshExec } from "../../../src/exec/runner/pipeline/execute.mjs";
import { startCommandTimeout } from "../../../src/exec/commands/timeout.mjs";

test("reports command timeout and closes the channel", () => {
  jest.useFakeTimers();
  const onTimeout = jest.fn();
  const close = jest.fn();
  const end = jest.fn();
  startCommandTimeout({
    timeout: 10,
    keepAlive: false,
    conn: { end },
    getChannel: () => ({ close }),
    onTimeout,
  });
  jest.advanceTimersByTime(10);
  expect(onTimeout).toHaveBeenCalledWith(expect.objectContaining({ code: "SSH_COMMAND_TIMEOUT" }));
  expect(close).toHaveBeenCalled();
  expect(end).not.toHaveBeenCalled();
  jest.useRealTimers();
});

test("ends a reusable connection after command timeout", () => {
  jest.useFakeTimers();
  const end = jest.fn();
  const close = jest.fn();
  startCommandTimeout({
    timeout: 1,
    keepAlive: true,
    conn: { end },
    getChannel: () => ({ close }),
    onTimeout: jest.fn(),
  });
  jest.advanceTimersByTime(1);
  expect(end).toHaveBeenCalled();
  expect(close).toHaveBeenCalled();
  jest.useRealTimers();
});
test("destroys a reusable connection when ending it throws", () => {
  jest.useFakeTimers();
  const destroy = jest.fn();
  startCommandTimeout({
    timeout: 1,
    keepAlive: true,
    conn: {
      end: () => {
        throw Error("closed");
      },
      destroy,
    },
    getChannel: () => undefined,
    onTimeout: jest.fn(),
  });
  jest.advanceTimersByTime(1);
  expect(destroy).toHaveBeenCalled();
  jest.useRealTimers();
});
test("times out a remote command through the execution pipeline", async () => {
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
      cb(null, {
        close() {},
        on() {
          return this;
        },
        stderr: {
          on() {
            return this;
          },
        },
      });
    }
    end() {}
  }
  await expect(
    sshExec({
      host: "x",
      commands: ["hang"],
      privateKey: "KEY",
      commandTimeout: 1,
      ClientClass: ClientMock,
    }),
  ).rejects.toMatchObject({ code: "SSH_COMMAND_TIMEOUT" });
});
test("ignores late stream close and timeout callbacks", async () => {
  let close;
  class C {
    on(event, fn) {
      if (event === "ready") this.ready = fn;
      return this;
    }
    connect() {
      this.ready();
    }
    end() {}
    exec(_, cb) {
      const stream = {
        on(event, fn) {
          if (event === "close") close = fn;
          return this;
        },
        stderr: {
          on() {
            return this;
          },
        },
        close() {},
      };
      cb(null, stream);
    }
  }
  await expect(
    sshExec({ host: "x", commands: ["x"], privateKey: "KEY", commandTimeout: 1, ClientClass: C }),
  ).rejects.toMatchObject({ code: "SSH_COMMAND_TIMEOUT" });
  close?.(0);
  jest.useFakeTimers();
  try {
    class Closed {
      on(event, fn) {
        if (event === "ready") this.ready = fn;
        return this;
      }
      connect() {
        this.ready();
      }
      end() {}
      exec(_, cb) {
        cb(null, {
          on(event, fn) {
            if (event === "close") fn(0);
            return this;
          },
          stderr: {
            on() {
              return this;
            },
          },
          close() {},
        });
      }
    }
    await expect(
      sshExec({
        host: "x",
        commands: ["x"],
        privateKey: "KEY",
        commandTimeout: 1,
        ClientClass: Closed,
      }),
    ).resolves.toHaveLength(1);
    jest.advanceTimersByTime(1);
  } finally {
    jest.useRealTimers();
  }
});
test("closes channels that open after timeout", async () => {
  let callback;
  const stream = {
    close: jest.fn(),
    on() {
      return this;
    },
  };
  class LateClient {
    on(event, fn) {
      if (event === "ready") this.ready = fn;
      return this;
    }
    connect() {
      this.ready();
    }
    end() {}
    exec(_, cb) {
      callback = cb;
    }
  }
  await expect(
    sshExec({
      host: "x",
      commands: ["x"],
      privateKey: "KEY",
      commandTimeout: 1,
      ClientClass: LateClient,
    }),
  ).rejects.toMatchObject({ code: "SSH_COMMAND_TIMEOUT" });
  callback(null, stream);
  expect(stream.close).toHaveBeenCalled();
});
