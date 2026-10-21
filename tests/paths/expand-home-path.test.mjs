import { expect, test } from "@jest/globals";
import { expandHomePath } from "../../src/paths/expand-home-path.mjs";

test("expands home-relative paths", () => {
  expect(expandHomePath("~/.ssh/known_hosts", () => "C:/fixture/home")).toBe(
    "C:/fixture/home/.ssh/known_hosts",
  );
  expect(expandHomePath("C:/fixture/tmp/key", () => "C:/fixture/home")).toBe("C:/fixture/tmp/key");
  expect(expandHomePath()).toBeUndefined();
});
