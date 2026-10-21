import { expect, test } from "@jest/globals";
import { closeSftp } from "../../../src/transfer/session/cleanup.mjs";

test("closes SFTP and returns synchronous close errors", () => {
  let closed = 0;
  expect(
    closeSftp({
      end: () => {
        closed += 1;
      },
    }),
  ).toBeUndefined();
  expect(closed).toBe(1);
  expect(
    closeSftp({
      end: () => {
        throw Error("close");
      },
    }),
  ).toMatchObject({ message: "close" });
});

test("returns the SFTP end result", () => {
  const result = Promise.resolve();
  expect(closeSftp({ end: () => result })).toBe(result);
});
