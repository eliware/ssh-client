import { expect, jest, test } from "@jest/globals";
import { startClientEstablishment } from "../../../../src/connection/lifecycle/client/establishment.mjs";

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
}

test("resolves when the transport becomes ready", async () => {
  class ReadyClient extends EventClient {
    connect() {
      this.handlers.get("ready")();
      this.handlers.get("error")(Error("late error"));
    }
  }
  const client = new ReadyClient();
  await expect(startClientEstablishment(client, {}, 100)).resolves.toBe(client);
});

test("rejects when connect throws after a synchronous ready event", async () => {
  class ReadyThenThrowClient extends EventClient {
    connect() {
      this.handlers.get("ready")();
      throw Error("connect failed");
    }
  }
  await expect(startClientEstablishment(new ReadyThenThrowClient(), {}, 100)).rejects.toMatchObject(
    {
      code: "SSH_CONNECTION",
      message: "SSH connection error: connect failed",
    },
  );
});

test.each(["end", "close"])("ignores a synchronous %s event after ready", async (event) => {
  class ReadyThenEndClient extends EventClient {
    connect() {
      this.handlers.get("ready")();
      this.handlers.get(event)();
    }
  }
  const client = new ReadyThenEndClient();
  await expect(startClientEstablishment(client, {}, 100)).resolves.toBe(client);
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
    const client = new ReadyDuringSetupClient();
    await expect(startClientEstablishment(client, {}, 100)).resolves.toBe(client);
    jest.advanceTimersByTime(100);
    expect(client.connect).not.toHaveBeenCalled();
    expect(client.end).not.toHaveBeenCalled();
    expect(client.handlers.size).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});

test("starts the transport before a queued ready event resolves", async () => {
  class QueuedReadyClient extends EventClient {
    connect = jest.fn();
    once(event, callback) {
      super.once(event, callback);
      if (event === "ready") queueMicrotask(callback);
      return this;
    }
  }
  const client = new QueuedReadyClient();
  await expect(startClientEstablishment(client, {}, 100)).resolves.toBe(client);
  expect(client.connect).toHaveBeenCalledTimes(1);
});

test.each(["error", "close"])("rejects when the transport emits %s before ready", async (event) => {
  class EarlyEventClient extends EventClient {
    connect() {
      this.handlers.get(event)(Error("early event"));
    }
  }
  await expect(startClientEstablishment(new EarlyEventClient(), {}, 100)).rejects.toMatchObject({
    code: "SSH_CONNECTION",
  });
});

test("normalizes a primitive transport error", async () => {
  class PrimitiveErrorClient extends EventClient {
    connect() {
      this.handlers.get("error")("broken");
    }
  }
  await expect(startClientEstablishment(new PrimitiveErrorClient(), {}, 100)).rejects.toMatchObject(
    {
      code: "SSH_CONNECTION",
      message: "SSH connection error: broken",
    },
  );
});

test("rejects and stops the transport after a connection timeout", async () => {
  class PendingClient extends EventClient {
    end = jest.fn();
    connect() {}
  }
  const client = new PendingClient();
  jest.useFakeTimers();
  try {
    const pending = startClientEstablishment(client, {}, 1);
    const rejection = expect(pending).rejects.toMatchObject({ code: "SSH_TIMEOUT" });
    jest.advanceTimersByTime(1);
    await rejection;
    expect(client.end).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});
