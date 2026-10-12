import { expect, test } from "@jest/globals";
import { parseCertificate } from "../../../src/security/known-hosts/certificate.mjs";

const string = (value) => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  return Buffer.concat([length, bytes]);
};

function certificate(
  type,
  publicFields,
  {
    principals = ["router"],
    signingKey = "ca",
    signature = "sig",
    critical = Buffer.alloc(0),
    extensions = Buffer.alloc(0),
    reserved = "",
  } = {},
) {
  const principalList = Buffer.concat(principals.map(string));
  const uint64 = (value) => {
    const bytes = Buffer.alloc(8);
    bytes.writeBigUInt64BE(BigInt(value));
    return bytes;
  };
  const uint32 = Buffer.alloc(4);
  uint32.writeUInt32BE(2);
  return Buffer.concat([
    string(type),
    string("nonce"),
    ...publicFields.map(string),
    uint64(7),
    uint32,
    string("key-id"),
    string(principalList),
    uint64(100),
    uint64(200),
    string(critical),
    string(extensions),
    string(reserved),
    string(signingKey),
    string(signature),
  ]);
}

test("ignores non-certificate host keys", () => {
  const field = (value) => Buffer.concat([Buffer.from([0, 0, 0, value.length]), value]);
  expect(parseCertificate(field(Buffer.from("ssh-ed25519")))).toBeNull();
});

test("rejects truncated certificate fields", () => {
  expect(() => parseCertificate(Buffer.alloc(2))).toThrow("truncated");
  const field = (value) => Buffer.concat([Buffer.from([0, 0, 0, value.length]), value]);
  expect(() => parseCertificate(field(Buffer.from("ssh-ed25519-cert-v01@openssh.com")))).toThrow(
    "truncated",
  );
});

test.each([
  ["ssh-ed25519", ["key"]],
  ["ssh-rsa", ["exponent", "modulus"]],
  ["ecdsa-sha2-nistp256", ["curve", "point"]],
])("parses %s host certificates", (base, fields) => {
  const type = `${base}-cert-v01@openssh.com`;
  const parsed = parseCertificate(certificate(type, fields));
  expect(parsed).toMatchObject({
    typeText: type,
    base,
    kind: 2,
    after: 100n,
    before: 200n,
    principals: ["router"],
    signingKey: Buffer.from("ca"),
    signature: Buffer.from("sig"),
  });
  expect(parsed.hostKey).toEqual(Buffer.concat([string(base), ...fields.map(string)]));
  expect(parsed.signed.length).toBeLessThan(certificate(type, fields).length);
});

test("parses an empty principal list and rejects unsupported certificate data", () => {
  const type = "ssh-ed25519-cert-v01@openssh.com";
  expect(parseCertificate(certificate(type, ["key"], { principals: [] })).principals).toEqual([]);
  expect(() => parseCertificate(certificate("unsupported-cert-v01@openssh.com", []))).toThrow(
    "unsupported host certificate type",
  );
  expect(() => parseCertificate(certificate(type, ["key"], { signingKey: "" }))).toThrow(
    "invalid host certificate signature fields",
  );
  const malformed = certificate(type, ["key"]);
  expect(() => parseCertificate(Buffer.concat([malformed, Buffer.from([0])]))).toThrow(
    "invalid host certificate signature fields",
  );
});

test("rejects critical options and malformed extension data", () => {
  const type = "ssh-ed25519-cert-v01@openssh.com";
  const option = Buffer.concat([string("force-command"), string(string("command"))]);
  expect(() => parseCertificate(certificate(type, ["key"], { critical: option }))).toThrow(
    "unsupported host certificate critical options",
  );
  expect(() =>
    parseCertificate(certificate(type, ["key"], { extensions: Buffer.from([0, 0, 0]) })),
  ).toThrow("truncated");
});

test("parses valid extensions and ignores the reserved field", () => {
  const type = "ssh-ed25519-cert-v01@openssh.com";
  const extensions = Buffer.concat([string("permit-pty"), string("")]);
  expect(
    parseCertificate(certificate(type, ["key"], { extensions, reserved: "reserved" })),
  ).toMatchObject({ base: "ssh-ed25519" });
});
