import { expect, jest, test } from "@jest/globals";
import { verifyCertificate } from "../../../../src/security/known-hosts/verification/certificate-verification.mjs";

const wireString = (value) => {
  const bytes = Buffer.from(value);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  return Buffer.concat([length, bytes]);
};

function validCertificate(algorithm = "ssh-ed25519", changes = {}) {
  return {
    signingKey: Buffer.from("ca"),
    kind: 2,
    after: 0n,
    before: 99n,
    principals: ["router"],
    base: "ssh-ed25519",
    signature: Buffer.concat([wireString(algorithm), wireString("signature")]),
    signed: Buffer.from("signed"),
    ...changes,
  };
}

function createCa(result = true) {
  return {
    getPublicSSH: () => Buffer.from("ca"),
    verify: jest.fn(() => result),
  };
}

test("rejects certificates without a usable CA or matching validity", () => {
  const cert = {
    signingKey: Buffer.from("ca"),
    kind: 2,
    after: 0n,
    before: 99n,
    principals: ["router"],
    base: "ssh-ed25519",
    signature: Buffer.alloc(0),
    signed: Buffer.from("signed"),
  };
  expect(verifyCertificate(cert, "ca", { parseKey: () => null }, ["router"], 10n)).toBe(false);
  const ca = { getPublicSSH: () => Buffer.from("other"), verify: () => true };
  expect(verifyCertificate(cert, "ca", { parseKey: () => ca }, ["router"], 10n)).toBe(false);
});

test("rejects expired, unauthorized, and malformed certificate signatures", () => {
  const cert = {
    signingKey: Buffer.from("ca"),
    kind: 2,
    after: 20n,
    before: 99n,
    principals: ["router"],
    base: "ssh-ed25519",
    signature: Buffer.alloc(0),
    signed: Buffer.from("signed"),
  };
  const ca = { getPublicSSH: () => Buffer.from("ca"), verify: () => true };
  const utils = { parseKey: () => ca };
  expect(verifyCertificate(cert, "ca", utils, ["router"], 10n)).toBe(false);
  cert.after = 0n;
  cert.principals = ["other"];
  expect(verifyCertificate(cert, "ca", utils, ["router"], 10n)).toBe(false);
});

test("rejects invalid CA, validity, principal, and signature data", () => {
  const ca = createCa();
  const cases = [
    [validCertificate(), {}, ["router"], 10n],
    [validCertificate(), { getPublicSSH: () => Buffer.from("ca") }, ["router"], 10n],
    [validCertificate(), ca, ["router"], 10n, { kind: 1 }],
    [validCertificate(), ca, ["router"], 10n, { before: 10n }],
    [validCertificate(), ca, [], 10n],
    [
      validCertificate("ssh-ed25519", {
        signature: Buffer.concat([wireString("ssh-ed25519"), wireString("sig"), Buffer.from([0])]),
      }),
      ca,
      ["router"],
      10n,
    ],
    [validCertificate("rsa-sha2-256", { base: "ssh-dss" }), ca, ["router"], 10n],
    [validCertificate("ssh-rsa", { base: "ssh-rsa" }), ca, ["router"], 10n],
    [validCertificate("ecdsa-sha2-nistp256", { base: "ecdsa-sha2-nistp384" }), ca, ["router"], 10n],
    [validCertificate("unknown-algorithm"), ca, ["router"], 10n],
  ];
  for (const [cert, authority, hosts, now, changes] of cases) {
    expect(
      verifyCertificate({ ...cert, ...changes }, "ca", { parseKey: () => authority }, hosts, now),
    ).toBe(false);
  }
  expect(
    verifyCertificate(
      validCertificate(),
      "ca",
      { parseKey: () => createCa(false) },
      ["router"],
      10n,
    ),
  ).toBe(false);
});

test("verifies Ed25519, RSA, and ECDSA signatures", () => {
  const cases = [
    ["ssh-ed25519", "ssh-ed25519", undefined],
    ["rsa-sha2-256", "ssh-rsa", "sha256"],
    ["rsa-sha2-512", "ssh-rsa", "sha512"],
    ["ecdsa-sha2-nistp256", "ecdsa-sha2-nistp256", "sha256"],
    ["ecdsa-sha2-nistp384", "ecdsa-sha2-nistp384", "sha384"],
    ["ecdsa-sha2-nistp521", "ecdsa-sha2-nistp521", "sha512"],
  ];
  for (const [algorithm, base, hash] of cases) {
    const ca = createCa();
    const cert = validCertificate(algorithm, { base });
    expect(verifyCertificate(cert, "ca", { parseKey: () => ca }, ["router"], 10n)).toBe(true);
    expect(ca.verify).toHaveBeenCalledWith(cert.signed, expect.any(Buffer), hash);
  }
});

test("rejects an unsupported ECDSA algorithm before CA verification", () => {
  const ca = createCa();
  const cert = validCertificate("ecdsa-sha2-custom-nistp256", {
    base: "ecdsa-sha2-nistp256",
  });
  expect(verifyCertificate(cert, "ca", { parseKey: () => ca }, ["router"], 10n)).toBe(false);
  expect(ca.verify).not.toHaveBeenCalled();
});

test("accepts an unlimited certificate end time and default clock", () => {
  const cert = validCertificate("ssh-ed25519", { before: 0xffffffffffffffffn });
  expect(verifyCertificate(cert, "ca", { parseKey: () => createCa() }, ["router"])).toBe(true);
});
