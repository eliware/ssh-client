import { expect, test } from "@jest/globals";
import { connect } from "../../../../src/connection/lifecycle/client/connect.mjs";

test("rejects missing connection options and opens a reusable client", async () => {
  await expect(connect()).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  class Client {
    once(event, callback) {
      this.handlers ??= {};
      this.handlers[event] = callback;
      return this;
    }
    on(event, callback) {
      this.handlers ??= {};
      this.handlers[event] = callback;
      return this;
    }
    connect() {
      this.handlers.ready();
    }
    end() {
      this.handlers.close?.();
    }
  }
  const client = await connect({ host: "router", privateKey: "KEY", ClientClass: Client });
  expect(client.state).toBe("open");
  await client.close();
  expect(client.state).toBe("closed");
});
