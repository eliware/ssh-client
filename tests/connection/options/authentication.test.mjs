import { expect, jest, test } from "@jest/globals";
import { prepareAuthentication } from "../../../src/connection/options/authentication.mjs";

test("loads a private key and returns authentication options", async () => {
  const result = await prepareAuthentication({
    privateKeyPath: "/key",
    passphrase: "phrase",
    fsLib: { readFile: jest.fn().mockResolvedValue("KEY") },
  });
  expect(result).toEqual({
    key: "KEY",
    passphrase: "phrase",
    password: undefined,
    agent: undefined,
  });
});

test.each([
  { password: "secret", expected: "secret" },
  { password: null, agent: "agent-socket", expected: null },
])(
  "skips key loading for password or agent authentication",
  async ({ password, agent, expected }) => {
    const result = await prepareAuthentication({
      password,
      agent,
      fsLib: {
        readFile: jest.fn(() => {
          throw Error("must not read a key");
        }),
      },
    });
    expect(result).toMatchObject({ key: undefined, password: expected, agent });
  },
);
