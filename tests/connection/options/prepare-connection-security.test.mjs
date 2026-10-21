import { expect, test } from "@jest/globals";
import { prepareConnectionSecurity } from "../../../src/connection/options/prepare-connection-security.mjs";

test("prepares security for a custom client class", async () => {
  class DefaultClient {}
  class CustomClient {}
  const security = await prepareConnectionSecurity(
    { host: "router", privateKey: "KEY", ClientClass: CustomClient },
    DefaultClient,
  );
  expect(security.key).toBe("KEY");
  expect(security.verifier).toEqual(expect.any(Function));
});

test("requires host verification for the default client class", async () => {
  class DefaultClient {}
  await expect(
    prepareConnectionSecurity({ host: "router", privateKey: "KEY" }, DefaultClient),
  ).rejects.toThrow("host verification");
});
