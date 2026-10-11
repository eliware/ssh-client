import { expect, jest, test } from "@jest/globals";
import { createFinisher } from "../../../../src/exec/runner/pipeline/finisher.mjs";

test("completes only the first settlement", () => {
  const state = { value: false };
  const complete = jest.fn();
  const finish = createFinisher(state, complete);
  finish("first");
  finish("second");
  expect(complete).toHaveBeenCalledTimes(1);
  expect(complete).toHaveBeenCalledWith("first");
});
