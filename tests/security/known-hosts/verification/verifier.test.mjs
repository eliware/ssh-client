import { expect, test, jest } from "@jest/globals";
import { createHostVerifier } from "../../../../src/security/known-hosts/verification/verifier.mjs";

function createUtils() {
  return {
    parseKey: (value) => {
      const key = String(value).split(/\s+/).at(-1);
      return {
        getPublicSSH: () => ({ value: key, equals: (other) => other.value === key }),
      };
    },
  };
}

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
    Buffer.alloc(8, 255),
    field(""),
    field(""),
    field(""),
    field("ca"),
    field(Buffer.concat([field("ssh-ed25519"), field("signature")])),
  ]);
}

test("accepts a matching host key and rejects an unknown key", async () => {
  const utils = createUtils();
  const verify = createHostVerifier({
    host: "router",
    knownHosts: "router ssh-test trusted",
    utils,
  });
  await expect(verify("trusted")).resolves.toBe(true);
  await expect(verify("unknown")).resolves.toBe(false);
});

test("matches the OpenSSH host form for each port", async () => {
  const utils = createUtils();
  const defaultPort = createHostVerifier({
    host: "router",
    port: 22,
    knownHosts: "router ssh-test trusted",
    utils,
  });
  const bracketedDefaultPort = createHostVerifier({
    host: "router",
    port: 22,
    knownHosts: "[router]:22 ssh-test trusted",
    utils,
  });
  const customPort = createHostVerifier({
    host: "router",
    port: 2222,
    knownHosts: "[router]:2222 ssh-test trusted",
    utils,
  });
  const bareCustomPort = createHostVerifier({
    host: "router",
    port: 2222,
    knownHosts: "router ssh-test trusted",
    utils,
  });
  await expect(defaultPort("trusted")).resolves.toBe(true);
  await expect(bracketedDefaultPort("trusted")).resolves.toBe(false);
  await expect(customPort("trusted")).resolves.toBe(true);
  await expect(bareCustomPort("trusted")).resolves.toBe(false);
});

test("reports invalid host records through the callback", async () => {
  const callback = jest.fn();
  const verify = createHostVerifier({
    host: "router",
    knownHosts: "router invalid key",
    utils: {
      parseKey: () => {
        throw Error("invalid");
      },
    },
  });
  expect(verify("key", callback)).toBeUndefined();
  await new Promise((resolve) => setImmediate(resolve));
  expect(callback).toHaveBeenCalledWith(false);
});

test("rejects invalid verifier configuration and host records", async () => {
  expect(createHostVerifier()("key")).toBe(false);
  expect(createHostVerifier({ host: "router", knownHosts: "hosts" })("key")).toBe(false);
  expect(createHostVerifier({ host: "router", knownHosts: "hosts", utils: {} })("key")).toBe(false);
  expect(createHostVerifier({ host: "router", utils: createUtils() })("key")).toBe(false);
  expect(createHostVerifier({ host: "router", knownHosts: "router ssh-test key" })("key")).toBe(
    false,
  );
  await expect(
    createHostVerifier({ host: "router", knownHosts: "router", utils: createUtils() })("key"),
  ).resolves.toBe(false);
  await expect(
    createHostVerifier({ host: "router", knownHosts: "router", utils: createUtils() })("trusted"),
  ).resolves.toBe(false);
  await expect(
    createHostVerifier({
      host: "router",
      knownHosts: "@revoked router ssh-test trusted",
      utils: createUtils(),
    })("trusted"),
  ).resolves.toBe(false);
});

test("reads known-host and CA files through the injected file system", async () => {
  const fsLib = {
    readFile: jest.fn(async (path) =>
      path === "known_hosts" ? "router ssh-test trusted" : "ssh-rsa ca-key",
    ),
  };
  const verifyKnownHost = createHostVerifier({
    host: "router",
    knownHostsPath: "known_hosts",
    hostCaPath: "ca_hosts",
    fsLib,
    utils: createUtils(),
  });
  await expect(verifyKnownHost("trusted")).resolves.toBe(true);
  expect(fsLib.readFile).toHaveBeenCalledWith("known_hosts", "utf8");
  expect(fsLib.readFile).toHaveBeenCalledWith("ca_hosts", "utf8");
});

test("accepts a certificate signed by a matching host authority", async () => {
  const ca = {
    getPublicSSH: () => Buffer.from("ca"),
    verify: () => true,
  };
  const utils = { parseKey: () => ca };
  const verify = createHostVerifier({
    host: "router",
    knownHosts: "@cert-authority router ssh-rsa ca-key",
    utils,
  });
  await expect(verify(certificateKey())).resolves.toBe(true);
});
