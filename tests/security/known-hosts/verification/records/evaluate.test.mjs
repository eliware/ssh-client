import { expect, test } from "@jest/globals";
import { evaluateRecords } from "../../../../../src/security/known-hosts/verification/records/evaluate.mjs";

test("evaluates trusted, revoked, and certificate-authority records", () => {
  const publicKey = { equals: () => true };
  const utils = { parseKey: () => ({ getPublicSSH: () => publicKey }) };
  expect(
    evaluateRecords(
      "router.example ssh-ed25519 key",
      ["router.example"],
      { getPublicSSH: () => publicKey },
      null,
      utils,
    ),
  ).toMatchObject({ accepted: true, invalid: false });
  expect(
    evaluateRecords(
      "@revoked router.example ssh-ed25519 key",
      ["router.example"],
      { getPublicSSH: () => publicKey },
      null,
      utils,
    ),
  ).toMatchObject({ revoked: ["ssh-ed25519 key"], invalid: false });
  expect(
    evaluateRecords(
      "@cert-authority router.example ssh-ed25519 key",
      ["router.example"],
      { getPublicSSH: () => publicKey },
      {},
      utils,
    ),
  ).toMatchObject({ authorities: ["ssh-ed25519 key"], invalid: false });
});

test("rejects malformed record markers and fields", () => {
  const utils = { parseKey: () => ({ getPublicSSH: () => ({ equals: () => false }) }) };
  expect(evaluateRecords("@unknown router key value", ["router"], {}, null, utils)).toMatchObject({
    invalid: true,
  });
  expect(evaluateRecords("router key", ["router"], {}, null, utils)).toMatchObject({
    invalid: true,
  });
  expect(
    evaluateRecords("@revoked router ssh-ed25519 key", ["router"], {}, null, {
      parseKey: () => null,
    }),
  ).toMatchObject({ invalid: true });
  expect(
    evaluateRecords("@revoked router ssh-ed25519 key", ["router"], {}, null, {
      parseKey: () => {
        throw Error("bad key");
      },
    }),
  ).toMatchObject({ invalid: true });
});

test("skips comments and unmatched records and keeps certificate keys separate", () => {
  const publicKey = { equals: (other) => other === publicKey };
  const utils = { parseKey: () => ({ getPublicSSH: () => publicKey }) };
  const actual = { getPublicSSH: () => publicKey };
  expect(
    evaluateRecords(
      "\n# comment\nother.example ssh-ed25519 key\n@revoked other.example ssh-ed25519 key\n@cert-authority other.example ssh-ed25519 key\nrouter ssh-ed25519 key",
      ["router"],
      actual,
      {},
      utils,
    ),
  ).toMatchObject({ accepted: false, authorities: [], revoked: [], invalid: false });
  expect(
    evaluateRecords("router ssh-ed25519 key", ["router"], actual, null, {
      parseKey: () => ({ getPublicSSH: () => ({ equals: () => false }) }),
    }),
  ).toMatchObject({ accepted: false, invalid: false });
});

test("ignores malformed records for unrelated hosts", () => {
  const publicKey = { equals: (other) => other === publicKey };
  const utils = { parseKey: () => ({ getPublicSSH: () => publicKey }) };
  const actual = { getPublicSSH: () => publicKey };
  expect(
    evaluateRecords(
      "unrelated.example malformed\nrouter ssh-ed25519 key",
      ["router"],
      actual,
      null,
      utils,
    ),
  ).toMatchObject({ accepted: true, invalid: false });
});

test("skips marker-only records before a matching host record", () => {
  const publicKey = { equals: (other) => other === publicKey };
  const utils = { parseKey: () => ({ getPublicSSH: () => publicKey }) };
  const actual = { getPublicSSH: () => publicKey };
  expect(
    evaluateRecords("@revoked\nrouter ssh-ed25519 key", ["router"], actual, null, utils),
  ).toMatchObject({ accepted: true, invalid: false });
});

test("rejects a malformed record for a matching host", () => {
  const utils = { parseKey: () => ({ getPublicSSH: () => ({ equals: () => true }) }) };
  expect(evaluateRecords("router malformed", ["router"], {}, null, utils)).toMatchObject({
    invalid: true,
  });
});

test("rejects a malformed marked record for an unrelated host", () => {
  const utils = { parseKey: () => null };
  expect(
    evaluateRecords(
      "@cert-authority unrelated.example ssh-ed25519 key",
      ["router"],
      {},
      null,
      utils,
    ),
  ).toMatchObject({ invalid: true });
  expect(
    evaluateRecords("@revoked unrelated.example ssh-ed25519", ["router"], {}, null, utils),
  ).toMatchObject({ invalid: true });
});
