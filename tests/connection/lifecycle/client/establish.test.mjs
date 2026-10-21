import { expect, jest, test } from "@jest/globals";
import { connect } from "../../../../src/connection/lifecycle/client/connect.mjs";
import { establishClient } from "../../../../src/connection/lifecycle/client/establish.mjs";

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

test("rejects transports missing required methods and stops the transport", async () => {
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
