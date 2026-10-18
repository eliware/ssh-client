import { expect, test } from "@jest/globals";
import { validateCertificateOptions } from "../../../../src/security/known-hosts/certificates/options.mjs";

const string = (value) => {
  const bytes = Buffer.from(value);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  return Buffer.concat([length, bytes]);
};

test("accepts empty critical options and valid extensions", () => {
  const extensions = Buffer.concat([string("permit-pty"), string("")]);
  expect(() => validateCertificateOptions(Buffer.alloc(0), extensions)).not.toThrow();
});

test("rejects critical options and duplicate names", () => {
  const option = Buffer.concat([string("force-command"), string("command")]);
  expect(() => validateCertificateOptions(option, Buffer.alloc(0))).toThrow(
    "unsupported host certificate options",
  );
  expect(() =>
    validateCertificateOptions(Buffer.alloc(0), Buffer.concat([option, option])),
  ).toThrow("invalid host certificate options");
});

test("rejects malformed option fields", () => {
  expect(() => validateCertificateOptions(Buffer.alloc(0), Buffer.from([0, 0, 0]))).toThrow(
    "truncated",
  );
});
