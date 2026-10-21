import { expect, test } from "@jest/globals";
import { validateConnectionOptions } from "../../../src/connection/options/validate.mjs";
import { prepareConnection } from "../../../src/connection/lifecycle/client/options.mjs";

test("rejects invalid connection ports and timeouts", async () => {
  const Client = class {};
  await expect(
    prepareConnection({ host: "router", port: 0, ClientClass: Client }),
  ).rejects.toMatchObject({
    code: "SSH_INVALID_OPTIONS",
  });
  await expect(
    prepareConnection({ host: "router", connectTimeout: 0, ClientClass: Client }),
  ).rejects.toMatchObject({
    code: "SSH_INVALID_OPTIONS",
  });
});

test("validates host, verifier, port, timeout, and host verification policy", () => {
  const Client = class {};
  expect(() =>
    validateConnectionOptions(
      { host: "router", ClientClass: class {}, hostVerifier: () => true },
      Client,
      100,
    ),
  ).not.toThrow();
  expect(() => validateConnectionOptions({}, Client, 100)).toThrow("host");
  expect(() =>
    validateConnectionOptions(
      { host: "router", hostVerifier: "invalid", ClientClass: class {} },
      Client,
      100,
    ),
  ).toThrow("hostVerifier");
  for (const port of [0, 65536, 1.5])
    expect(() =>
      validateConnectionOptions(
        { host: "router", ClientClass: class {}, hostVerifier: () => true, port },
        Client,
        100,
      ),
    ).toThrow("TCP endpoint number");
  for (const timeout of [0, Number.NaN, Infinity, -1, "fast"])
    expect(() =>
      validateConnectionOptions(
        { host: "router", ClientClass: class {}, hostVerifier: () => true },
        Client,
        timeout,
      ),
    ).toThrow("connectTimeout");
  expect(() =>
    validateConnectionOptions({ host: "router", ClientClass: Client }, Client, 100),
  ).toThrow("host verification");
});
