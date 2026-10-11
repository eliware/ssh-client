import { expect, test } from "@jest/globals";
import { encodeString } from "../../../../src/security/known-hosts/encoding/encode-string.mjs";

test("encodes an SSH string", () => {
  expect(encodeString(Buffer.from("host"))).toEqual(Buffer.from([0, 0, 0, 4, 104, 111, 115, 116]));
});
