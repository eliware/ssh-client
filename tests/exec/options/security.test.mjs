import { expect, test } from "@jest/globals";
import { prepareExecutionSecurity } from "../../../src/exec/options/security.mjs";

test("normalizes connection security setup failures", async () => {
  const cause = await prepareExecutionSecurity(
    { host: "router", hostVerifier: "invalid" },
    class {},
  ).catch((error) => error);
  expect(cause).toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  expect(cause.cause).toBeInstanceOf(Error);
});

test("returns prepared connection security", async () => {
  const security = await prepareExecutionSecurity(
    { host: "router", privateKey: "KEY", hostVerifier: () => true },
    class {},
  );
  expect(security).toEqual(expect.objectContaining({ verifier: expect.any(Function) }));
});
