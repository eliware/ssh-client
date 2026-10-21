import { expect, test } from "@jest/globals";
import { extractCertificatePublicKey } from "../../../../src/security/known-hosts/certificates/public-key.mjs";

function string(value) {
  const bytes = Buffer.from(value);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  return Buffer.concat([length, bytes]);
}

test("rebuilds the public host key from the base type and fields", () => {
  expect(
    extractCertificatePublicKey("ssh-rsa", [Buffer.from("exponent"), Buffer.from("modulus")]),
  ).toEqual(Buffer.concat([string("ssh-rsa"), string("exponent"), string("modulus")]));
});
