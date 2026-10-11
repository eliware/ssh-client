import { expect, jest, test } from "@jest/globals";
import { createExecutionQueue } from "../../../../src/exec/runner/pipeline/create-execution-queue.mjs";

test("finishes an execution queue with no commands", () => {
  const finish = jest.fn();
  const queue = createExecutionQueue({ commands: [] }, { results: [] }, finish);
  queue();
  expect(finish).toHaveBeenCalledTimes(1);
});
