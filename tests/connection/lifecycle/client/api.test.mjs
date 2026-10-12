import { expect, jest, test } from "@jest/globals";
import { EventEmitter } from "node:events";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir, homedir } from "node:os";
import { pathToFileURL } from "node:url";
import ssh2 from "@eliware/ssh2";
import { createHostVerifier } from "../../../../src/public-api.mjs";
import { connect } from "../../../../src/connection/lifecycle/client/connect.mjs";
import { createReusableClientApi } from "../../../../src/connection/lifecycle/client/api.mjs";

test("exposes open state and rejects operations after close", async () => {
  const client = {
    end: jest.fn(() => {
      throw Error("closed");
    }),
    once: jest.fn(),
  };
  const api = createReusableClientApi(client, { host: "router", privateKey: "KEY" });
  expect(api.state).toBe("open");
  expect(typeof api.exec).toBe("function");
  expect(typeof api.shell).toBe("function");
  expect(typeof api.upload).toBe("function");
  expect(typeof api.download).toBe("function");
  expect(typeof api.close).toBe("function");
  await expect(api.close()).resolves.toBeUndefined();
  await expect(api.exec([])).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  await expect(api.shell()).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  await expect(api.upload({ localPath: "a", remotePath: "b" })).rejects.toMatchObject({
    code: "SSH_CONNECTION",
  });
  await expect(api.download({ remotePath: "a", localPath: "b" })).rejects.toMatchObject({
    code: "SSH_CONNECTION",
  });
});

const integrationReady =
  process.env.SSH_CLIENT_INTEGRATION === "1" &&
  process.env.SSH_CLIENT_INTEGRATION_HOST &&
  process.env.SSH_CLIENT_INTEGRATION_USER &&
  (process.env.SSH_CLIENT_INTEGRATION_PRIVATE_KEY || process.env.SSH_CLIENT_INTEGRATION_PASSWORD) &&
  (process.env.SSH_CLIENT_INTEGRATION_KNOWN_HOSTS || process.env.SSH_CLIENT_INTEGRATION_CA);
const integrationTest = integrationReady ? test : test.skip;
integrationTest("real SSH integration: verifies, executes, transfers, and closes", async () => {
  const transport = process.env.SSH_CLIENT_INTEGRATION_TRANSPORT
    ? (await import(pathToFileURL(process.env.SSH_CLIENT_INTEGRATION_TRANSPORT))).default
    : undefined;
  const client = await connect({
    host: process.env.SSH_CLIENT_INTEGRATION_HOST,
    port: Number(process.env.SSH_CLIENT_INTEGRATION_PORT || 22),
    username: process.env.SSH_CLIENT_INTEGRATION_USER,
    privateKeyPath: process.env.SSH_CLIENT_INTEGRATION_PRIVATE_KEY,
    password: process.env.SSH_CLIENT_INTEGRATION_PASSWORD,
    knownHostsPath: process.env.SSH_CLIENT_INTEGRATION_KNOWN_HOSTS,
    hostCaPath: process.env.SSH_CLIENT_INTEGRATION_CA,
    ClientClass: transport,
  });
  const source = join(await fs.mkdtemp(join(tmpdir(), "ssh-client-integration-")), "source.txt");
  const copy = `${source}.copy`;
  const remote =
    process.env.SSH_CLIENT_INTEGRATION_REMOTE_PATH || `/tmp/ssh-client-${Date.now()}.txt`;
  await fs.writeFile(source, "ssh-client integration\n");
  try {
    const [result] = await client.exec(["echo integration"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("integration");
    await client.upload({ localPath: source, remotePath: remote });
    await client.download({ remotePath: remote, localPath: copy });
    expect(await fs.readFile(copy, "utf8")).toBe("ssh-client integration\n");
  } finally {
    await client.close();
    await fs.rm(source, { force: true });
    await fs.rm(copy, { force: true });
  }
});

integrationTest("real SSH certificate policy rejects tampering and revocation", async () => {
  const certPath = process.env.SSH_CLIENT_INTEGRATION_CERT;
  if (!certPath || !process.env.SSH_CLIENT_INTEGRATION_CA) return;
  const encoded = (await fs.readFile(certPath, "utf8")).trim().split(/\s+/)[1];
  const valid = Buffer.from(encoded, "base64");
  const invalid = Buffer.from(valid);
  invalid[invalid.length - 1] ^= 1;
  const verifier = createHostVerifier({
    host: process.env.SSH_CLIENT_INTEGRATION_HOST,
    port: Number(process.env.SSH_CLIENT_INTEGRATION_PORT || 22),
    hostCaPath: process.env.SSH_CLIENT_INTEGRATION_CA,
    fsLib: fs,
    homedirFn: homedir,
    utils: ssh2.utils,
  });
  expect(await verifier(valid)).toBe(true);
  expect(await verifier(invalid)).toBe(false);
  const revoked = createHostVerifier({
    host: process.env.SSH_CLIENT_INTEGRATION_HOST,
    port: Number(process.env.SSH_CLIENT_INTEGRATION_PORT || 22),
    knownHosts: `@revoked ${process.env.SSH_CLIENT_INTEGRATION_HOST} ssh-ed25519 key`,
    hostCaPath: process.env.SSH_CLIENT_INTEGRATION_CA,
    fsLib: fs,
    homedirFn: homedir,
    utils: ssh2.utils,
  });
  expect(await revoked(valid)).toBe(false);
});

test("closes the reusable API when shell setup times out", async () => {
  const client = { end: jest.fn(), shell() {} };
  const api = createReusableClientApi(client, { host: "router", privateKey: "KEY" });
  await expect(api.shell({ timeout: 1 })).rejects.toMatchObject({ code: "SSH_TIMEOUT" });
  expect(api.state).toBe("closed");
});

test("closes the transport after an open shell stream fails", async () => {
  const client = new EventEmitter();
  const stream = new EventEmitter();
  client.shell = (callback) => callback(null, stream);
  client.end = jest.fn(() => client.emit("close"));
  stream.close = jest.fn();
  stream.end = jest.fn();
  const api = createReusableClientApi(client, { host: "router", privateKey: "KEY" });
  const session = await api.shell();
  const failed = expect(session.completion).rejects.toMatchObject({ code: "SSH_SHELL" });
  stream.emit("error", Error("shell failed"));
  await failed;
  expect(api.state).toBe("closed");
  expect(client.end).toHaveBeenCalledTimes(1);
});

test("closes the reusable API when an execution times out", async () => {
  const client = {
    on(event, handler) {
      if (event === "ready") this.ready = handler;
      return this;
    },
    once(event, handler) {
      if (event === "ready") this.ready = handler;
      return this;
    },
    emit(event) {
      if (event === "ready") this.ready?.();
      return this;
    },
    connect() {
      this.ready();
    },
    end: jest.fn(),
    exec() {},
  };
  const api = createReusableClientApi(client, { host: "router", privateKey: "KEY" });
  await expect(api.exec(["run"], { commandTimeout: 1 })).rejects.toMatchObject({
    code: "SSH_COMMAND_TIMEOUT",
  });
  expect(api.state).toBe("closed");
});

test("rejects queued work after close begins", async () => {
  let release;
  const client = {
    end: jest.fn(),
    once(event, callback) {
      if (event === "close") this.close = callback;
      return this;
    },
    sftp(callback) {
      release = callback;
    },
  };
  const api = createReusableClientApi(client, { host: "router", privateKey: "KEY" });
  const first = api.upload({ localPath: "a", remotePath: "b" });
  const second = api.upload({ localPath: "c", remotePath: "d" });
  const queuedExec = api.exec(["echo queued"]);
  const queuedDownload = api.download({ remotePath: "c", localPath: "d" });
  const closing = api.close();
  release?.(new Error("late"), undefined);
  await expect(first).rejects.toBeDefined();
  await expect(second).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  await expect(queuedExec).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  await expect(queuedDownload).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  client.close?.();
  await closing.catch(() => {});
});
