import { expect, jest, test } from "@jest/globals";
import { prepareHostVerification } from "../../../src/connection/options/host-verification.mjs";

test("adapts a custom host verifier", () => {
  const verifier = prepareHostVerification({ hostVerifier: () => true });
  const callback = jest.fn();
  expect(verifier(Buffer.from("key"), callback)).toBeUndefined();
  expect(callback).toHaveBeenCalledWith(true);
});

test("adapts a callback-style custom verifier that returns undefined", () => {
  const verifier = prepareHostVerification({
    hostVerifier: (_key, callback) => callback(true),
  });
  const callback = jest.fn();
  expect(verifier(Buffer.from("key"), callback)).toBeUndefined();
  expect(callback).toHaveBeenCalledWith(true);
});

test("uses the configured known-host source for the default verifier", async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-21T12:00:00.000Z"));
  const callback = jest.fn();
  try {
    const verifier = prepareHostVerification({
      host: "router",
      knownHosts: "router ssh-ed25519 AAAA",
    });
    verifier(Buffer.from("invalid key"), callback);
    await jest.runAllTimersAsync();
    expect(callback).toHaveBeenCalledWith(false);
  } finally {
    jest.useRealTimers();
  }
});
