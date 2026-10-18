import { expect, test } from "@jest/globals";
import { readString } from "../../../../../src/security/known-hosts/encoding/read/string.mjs";

test("reads SSH strings and rejects truncation", () => {
  const encoded = Buffer.from([0, 0, 0, 4, 104, 111, 115, 116]);
  expect(readString(encoded, 0)).toEqual({ value: Buffer.from("host"), next: 8 });
  expect(() => readString(Buffer.alloc(3), 0)).toThrow("truncated");
  expect(() => readString(Buffer.from([0, 0, 0, 4, 1]), 0)).toThrow("truncated");
});
