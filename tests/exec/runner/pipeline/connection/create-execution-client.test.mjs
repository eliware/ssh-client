import { expect, test } from "@jest/globals";
import { createExecutionClient } from "../../../../../src/exec/runner/pipeline/connection/create-execution-client.mjs";

test("creates a configured execution transport", () => {
  class Client {
    on() {}
    connect() {}
  }
  expect(createExecutionClient(Client)).toBeInstanceOf(Client);
});

test("normalizes construction failures", () => {
  for (const failure of [Error("construct"), "construct"]) {
    expect(() =>
      createExecutionClient(
        class {
          constructor() {
            throw failure;
          }
        },
      ),
    ).toThrow("SSH connection error: construct");
  }
});

test("rejects a client without the execution transport interface", () => {
  expect(() => createExecutionClient(class {})).toThrow("transport interface");
  expect(() =>
    createExecutionClient(
      class {
        on() {}
      },
    ),
  ).toThrow("transport interface");
});
