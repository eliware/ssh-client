import { expect, test } from "@jest/globals";
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
  removeListener() {}
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
  await expect(establishClient(class {}, {}, 100)).rejects.toMatchObject({
    code: "SSH_CONNECTION",
  });
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
