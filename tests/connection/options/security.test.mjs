import { expect, jest, test } from "@jest/globals";
import { prepareSecurity } from "../../../src/connection/options/security.mjs";

test("prepares key and verifier policy", async () => {
  const result = await prepareSecurity({
    host: "router",
    port: 22,
    privateKey: "KEY",
    password: undefined,
    agent: undefined,
    hostVerifier: () => true,
  });
  expect(result).toMatchObject({ key: "KEY" });
  expect(typeof result.verifier).toBe("function");
});

test("validates verifier and required trust configuration", async () => {
  await expect(prepareSecurity({ host: "router", hostVerifier: "bad" })).rejects.toThrow(
    "hostVerifier",
  );
  await expect(
    prepareSecurity({ host: "router", clientIsDefault: true, requireVerification: true }),
  ).rejects.toThrow("host verification");
});

test("uses a custom verifier with password authentication and no key", async () => {
  const result = await prepareSecurity({
    host: "router",
    password: "pw",
    hostVerifier: () => true,
    fsLib: {
      readFile: jest.fn(() => {
        throw Error("must not read a key");
      }),
    },
  });
  expect(result.key).toBeUndefined();
  expect(result.password).toBe("pw");
  expect(result.verifier).toBe(result.hostVerifier);
});
