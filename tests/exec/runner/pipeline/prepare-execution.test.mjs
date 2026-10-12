import { expect, test } from "@jest/globals";
import { prepareExecutionWithCancellation } from "../../../../src/exec/runner/pipeline/prepare-execution.mjs";

test("rejects an operation cancelled before preparation", async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    prepareExecutionWithCancellation({ signal: controller.signal }),
  ).rejects.toMatchObject({
    code: "SSH_CANCELLED",
  });
});

test("rejects when cancellation arrives during preparation", async () => {
  let abortHandler;
  let reads = 0;
  const signal = {
    get aborted() {
      reads += 1;
      if (reads === 2) abortHandler();
      return false;
    },
    addEventListener(_event, callback) {
      abortHandler = callback;
    },
    removeEventListener() {},
  };
  await expect(
    prepareExecutionWithCancellation({
      host: "router",
      commands: [],
      privateKey: "KEY",
      ClientClass: class {},
      signal,
    }),
  ).rejects.toMatchObject({ code: "SSH_CANCELLED" });
});
