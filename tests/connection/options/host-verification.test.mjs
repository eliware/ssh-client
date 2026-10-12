import { expect, jest, test } from "@jest/globals";
import { prepareHostVerification } from "../../../src/connection/options/host-verification.mjs";

test("adapts a custom host verifier", () => {
  const verifier = prepareHostVerification({ hostVerifier: () => true });
  const callback = jest.fn();
  expect(verifier(Buffer.from("key"), callback)).toBeUndefined();
  expect(callback).toHaveBeenCalledWith(true);
});

test("creates a verifier from known-host records", () => {
  const verifier = prepareHostVerification({
    host: "router",
    port: 22,
    knownHosts: "router ssh-ed25519 AAAA",
  });
  expect(typeof verifier).toBe("function");
});

test("requires a verifier or trust source for the default client", () => {
  expect(() =>
    prepareHostVerification({ clientIsDefault: true, requireVerification: true }),
  ).toThrow("host verification");
});

test("rejects a non-function custom verifier", () => {
  expect(() => prepareHostVerification({ hostVerifier: "bad" })).toThrow("hostVerifier");
});
