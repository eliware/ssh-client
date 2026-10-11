import { expect, test, jest } from "@jest/globals";
import { startExecutionConnection } from "../../../../src/exec/runner/pipeline/connection.mjs";

test("starts an execution connection and forwards configuration", async () => {
  let options;
  class Client {
    on(event, handler) {
      this[event] = handler;
      return this;
    }
    connect(value) {
      options = value;
      this.ready();
    }
  }
  const connection = startExecutionConnection(
    {
      ClientClass: Client,
      host: "router",
      port: 22,
      username: "user",
      key: "KEY",
      connectTimeout: 1000,
    },
    { onReady() {}, onError() {}, onClosed() {}, onTimeout() {}, onConnectError() {} },
  );
  connection.connect();
  expect(connection.conn).toBeInstanceOf(Client);
  expect(options).toMatchObject({ host: "router", privateKey: "KEY" });
  clearTimeout(connection.timer);
});

test("reports construction and interface failures", () => {
  expect(() =>
    startExecutionConnection(
      {
        ClientClass: class {
          constructor() {
            throw Error("construct");
          }
        },
        connectTimeout: 1,
      },
      {},
    ),
  ).toThrow("connection error");
  expect(() =>
    startExecutionConnection(
      {
        ClientClass: class {
          constructor() {
            throw "construct";
          }
        },
        connectTimeout: 1,
      },
      {},
    ),
  ).toThrow("connection error");
  expect(() => startExecutionConnection({ ClientClass: class {}, connectTimeout: 1 }, {})).toThrow(
    "transport interface",
  );
});

test("reports synchronous connect failures", async () => {
  class Client {
    on() {
      return this;
    }
    connect() {
      throw Error("connect");
    }
  }
  const onConnectError = jest.fn();
  const connection = startExecutionConnection(
    { ClientClass: Client, connectTimeout: 1000 },
    { onReady() {}, onError() {}, onClosed() {}, onTimeout() {}, onConnectError },
  );
  connection.connect();
  expect(onConnectError).toHaveBeenCalledWith(expect.objectContaining({ code: "SSH_CONNECTION" }));
  clearTimeout(connection.timer);
});
