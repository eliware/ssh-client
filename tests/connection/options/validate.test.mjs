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

test("validates host, port, and timeout", () => {
  expect(() =>
    validateConnectionOptions({ host: "router", ClientClass: class {} }, 100),
  ).not.toThrow();
  expect(() => validateConnectionOptions({}, 100)).toThrow("host");
  for (const port of [0, 65536, 1.5])
    expect(() =>
      validateConnectionOptions({ host: "router", ClientClass: class {}, port }, 100),
    ).toThrow("TCP endpoint number");
  for (const timeout of [0, Number.NaN, Infinity, -1, "fast"])
    expect(() =>
      validateConnectionOptions({ host: "router", ClientClass: class {} }, timeout),
    ).toThrow("connectTimeout");
});
