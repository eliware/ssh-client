import { expect, jest, test } from "@jest/globals";
import { connect } from "../../../../src/connection/lifecycle/client/connect.mjs";
import { prepareConnection } from "../../../../src/connection/lifecycle/client/options.mjs";

test("rejects missing connection options", async () => {
  await expect(prepareConnection()).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
});

test("uses fallback username and default port", async () => {
  const originalUser = process.env.USER;
  const originalUsername = process.env.USERNAME;
  delete process.env.USER;
  process.env.USERNAME = "fallback-user";
  const mockFs = { readFile: jest.fn().mockResolvedValue("PRIVATEKEY") };
  try {
    const prepared = await prepareConnection({
      host: "localhost",
      password: "pw",
      hostVerifier: () => true,
      ClientClass: class {},
      fsLib: mockFs,
    });
    expect(prepared.clientConfig.username).toBe("fallback-user");
    expect(prepared.clientConfig.port).toBe(22);
  } finally {
    if (originalUser === undefined) delete process.env.USER;
    else process.env.USER = originalUser;
    if (originalUsername === undefined) delete process.env.USERNAME;
    else process.env.USERNAME = originalUsername;
  }
});

test("maps the loaded key to SSH2 privateKey for reusable connections", async () => {
  let transportOptions;
  class KeyClient {
    once(event, handler) {
      this.handlers ??= {};
      this.handlers[event] = handler;
      if (event === "ready") queueMicrotask(handler);
      return this;
    }
    on() {
      return this;
    }
    connect(options) {
      transportOptions = options;
    }
    end() {
      this.handlers.close?.();
    }
  }
  await connect({
    host: "router",
    privateKeyPath: "/key",
    knownHosts: "router ssh-ed25519 AAAA",
    fsLib: { readFile: async () => "PRIVATE KEY" },
    ClientClass: KeyClient,
  });
  expect(transportOptions.privateKey).toBe("PRIVATE KEY");
  expect(transportOptions.key).toBeUndefined();
});
