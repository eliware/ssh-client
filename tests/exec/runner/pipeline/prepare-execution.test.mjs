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
