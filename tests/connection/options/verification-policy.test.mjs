import { expect, test } from "@jest/globals";
import { validateHostVerificationPolicy } from "../../../src/connection/options/verification-policy.mjs";

test("rejects non-function host verifiers", () => {
  expect(() => validateHostVerificationPolicy({ hostVerifier: "invalid" })).toThrow("hostVerifier");
});

test("requires a trust source for the default client when required", () => {
  expect(() =>
    validateHostVerificationPolicy({ clientIsDefault: true, requireVerification: true }),
  ).toThrow("host verification");
});

test.each([
  ["a custom verifier", { hostVerifier: () => true }],
  ["known-host text", { knownHosts: "router ssh-ed25519 key" }],
  ["a known-host path", { knownHostsPath: "/known_hosts" }],
  ["a host CA path", { hostCaPath: "/host-ca.pub" }],
])("accepts %s as a trust source", (_name, source) => {
  expect(() =>
    validateHostVerificationPolicy({
      ...source,
      clientIsDefault: true,
      requireVerification: true,
    }),
  ).not.toThrow();
});

test("does not require a built-in trust source for custom clients", () => {
  expect(() =>
    validateHostVerificationPolicy({ clientIsDefault: false, requireVerification: true }),
  ).not.toThrow();
});

test("does not require trust when verification is optional", () => {
  expect(() =>
    validateHostVerificationPolicy({ clientIsDefault: true, requireVerification: false }),
  ).not.toThrow();
});
