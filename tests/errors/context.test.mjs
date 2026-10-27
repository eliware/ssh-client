import { expect, test } from "@jest/globals";
import { createErrorContext } from "../../src/errors/context.mjs";

test("adds default operation and phase values", () => {
  expect(createErrorContext()).toEqual({ operation: "unknown", phase: "unknown" });
});

test("keeps supplied context and fills missing values", () => {
  expect(
    createErrorContext({ operation: "connect", phase: undefined, detail: "host check" }),
  ).toEqual({ operation: "connect", phase: "unknown", detail: "host check" });
});
