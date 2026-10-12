import { expect, jest, test } from "@jest/globals";
import { connect } from "../../../../src/connection/lifecycle/client/connect.mjs";
import { establishClient } from "../../../../src/connection/lifecycle/client/establish.mjs";

class EventClient {
  handlers = new Map();
  once(event, callback) {
    this.handlers.set(event, callback);
    return this;
  }
  on(event, callback) {
    this.handlers.set(event, callback);
    return this;
  }
  removeListener(event) {
    this.handlers.delete(event);
  }
  connect() {
    this.handlers.get(this.event)?.();
  }
  end() {}
}

test("rejects when the transport ends before ready", async () => {
  class EndingClient {
    once(event, fn) {
      if (event === "end") queueMicrotask(fn);
      return this;
    }
    connect() {}
  }
  await expect(
    connect({ host: "router", privateKey: "KEY", ClientClass: EndingClient }),
  ).rejects.toMatchObject({ code: "SSH_CONNECTION" });
});

test("rejects when client construction throws", async () => {
  await expect(
    connect({
      host: "router",
      privateKey: "KEY",
      ClientClass: class {
        constructor() {
          throw Error("construct");
        }
      },
    }),
  ).rejects.toMatchObject({ code: "SSH_CONNECTION" });
});

test("normalizes null thrown by the transport constructor", async () => {
  await expect(
    connect({
      host: "router",
      privateKey: "KEY",
      ClientClass: class {
        constructor() {
          throw null;
        }
      },
    }),
  ).rejects.toMatchObject({ code: "SSH_CONNECTION", message: "SSH connection error: null" });
});

test("rejects when the transport connect call throws", async () => {
  class ThrowingClient {
    once() {
      return this;
    }
    on() {
      return this;
    }
    connect() {
      throw Error("connect sync");
    }
  }
  await expect(
    connect({ host: "router", privateKey: "KEY", ClientClass: ThrowingClient }),
  ).rejects.toMatchObject({ code: "SSH_CONNECTION" });
});

test("rejects transports missing required methods", async () => {
  const end = jest.fn();
  class InvalidClient {
    end() {
      end();
    }
  }
  await expect(establishClient(InvalidClient, {}, 100)).rejects.toMatchObject({
    code: "SSH_CONNECTION",
  });
  expect(end).toHaveBeenCalledTimes(1);
});

test("resolves when the transport becomes ready", async () => {
  class ReadyClient extends EventClient {
    connect() {
      this.handlers.get("ready")();
      this.handlers.get("error")(Error("late error"));
    }
  }
  const client = await establishClient(ReadyClient, {}, 100);
  expect(client).toBeInstanceOf(ReadyClient);
});

test("does not start a timeout when ready fires during listener setup", async () => {
  jest.useFakeTimers();
  try {
    class ReadyDuringSetupClient extends EventClient {
      end = jest.fn();
      connect = jest.fn();
      once(event, callback) {
        if (event === "ready") callback();
        else super.once(event, callback);
        return this;
      }
    }
    const client = await establishClient(ReadyDuringSetupClient, {}, 100);
    jest.advanceTimersByTime(100);
    expect(client.connect).not.toHaveBeenCalled();
    expect(client.end).not.toHaveBeenCalled();
    expect(client.handlers.size).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});

test.each(["error", "close"])("rejects when the transport emits %s before ready", async (event) => {
  class EarlyEventClient extends EventClient {
    connect() {
      this.handlers.get(event)(Error("early event"));
    }
  }
  await expect(establishClient(EarlyEventClient, {}, 100)).rejects.toMatchObject({
    code: "SSH_CONNECTION",
  });
});

test("rejects and stops the transport after a connection timeout", async () => {
  await expect(establishClient(EventClient, {}, 1)).rejects.toMatchObject({
    code: "SSH_TIMEOUT",
  });
});
