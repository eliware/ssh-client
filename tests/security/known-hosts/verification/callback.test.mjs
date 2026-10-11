import { expect, jest, test } from "@jest/globals";
import { finishVerification } from "../../../../src/security/known-hosts/verification/callback.mjs";

test("returns promises directly and forwards callback results", async () => {
  const verification = Promise.resolve(true);
  await expect(finishVerification(verification)).resolves.toBe(true);
  const callback = jest.fn();
  expect(finishVerification(Promise.resolve(false), callback)).toBeUndefined();
  await Promise.resolve();
  expect(callback).toHaveBeenCalledWith(false);
});

test("swallows callback exceptions", async () => {
  expect(
    finishVerification(Promise.resolve(true), () => {
      throw Error("callback");
    }),
  ).toBeUndefined();
  await Promise.resolve();
});
