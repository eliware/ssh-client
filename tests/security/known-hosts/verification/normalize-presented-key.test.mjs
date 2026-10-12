import { expect, jest, test } from "@jest/globals";
import { normalizePresentedKey } from "../../../../src/security/known-hosts/verification/normalize-presented-key.mjs";

function certificateKey() {
  const field = (value) => {
    const bytes = Buffer.from(value);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    return Buffer.concat([length, bytes]);
  };
  const uint64 = Buffer.alloc(8);
  const uint32 = Buffer.alloc(4);
  uint32.writeUInt32BE(2);
  return Buffer.concat([
    field("ssh-ed25519-cert-v01@openssh.com"),
    field("nonce"),
    field("public-key"),
    uint64,
    uint32,
    field("id"),
    field(field("router")),
    uint64,
    uint64,
    field(""),
    field(""),
    field(""),
    field("ca"),
    field("signature"),
  ]);
}

test("normalizes ordinary presented keys", () => {
  const parsed = { getPublicSSH: () => Buffer.from("public") };
  expect(normalizePresentedKey(Buffer.from("key"), { parseKey: () => parsed })).toEqual({
    actual: parsed,
    certificate: null,
  });
});

test("fails safely for malformed presented keys", () => {
  expect(() =>
    normalizePresentedKey(Buffer.from("bad"), {
      parseKey: () => {
        throw Error("bad");
      },
    }),
  ).toThrow("bad");
});

test("uses the certificate public key when the presented key is a certificate", () => {
  const parsed = { getPublicSSH: () => Buffer.from("parsed public key") };
  const parseKey = jest.fn(() => parsed);
  const result = normalizePresentedKey(certificateKey(), { parseKey });
  expect(result.certificate.base).toBe("ssh-ed25519");
  expect(result.actual).toBe(parsed);
  expect(parseKey).toHaveBeenCalledWith(
    Buffer.concat([
      Buffer.from([0, 0, 0, 11]),
      Buffer.from("ssh-ed25519"),
      Buffer.from([0, 0, 0, 10]),
      Buffer.from("public-key"),
    ]),
  );
});

test("rejects a certificate with an invalid public key", () => {
  expect(() =>
    normalizePresentedKey(certificateKey(), {
      parseKey: () => Error("bad public key"),
    }),
  ).toThrow("invalid presented SSH key");
});
