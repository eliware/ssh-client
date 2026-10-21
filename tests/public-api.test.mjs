import { expect, jest, test } from "@jest/globals";
import { EventEmitter } from "node:events";
import {
  SshError,
  loadKey,
  expandPath,
  createHostVerifier,
  sshExec,
  connect,
  upload,
  download,
} from "../src/public-api.mjs";

test("exports the public API and rejects missing operation options", async () => {
  expect(SshError).toBeDefined();
  for (const api of [loadKey, expandPath, createHostVerifier, sshExec, connect, upload, download]) {
    expect(typeof api).toBe("function");
  }
  for (const operation of [sshExec, connect, upload, download])
    await expect(operation()).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  for (const operation of [upload, download])
    await expect(operation(null)).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
});

test("rejects invalid transfer paths through the public API", async () => {
  class Client extends EventEmitter {
    connect() {
      this.emit("ready");
    }
    end() {
      this.emit("close");
    }
  }
  const options = { host: "router", privateKey: "KEY", ClientClass: Client };
  await expect(upload({ ...options, localPath: "", remotePath: "remote" })).rejects.toMatchObject({
    code: "SSH_INVALID_OPTIONS",
  });
  await expect(download({ ...options, remotePath: "", localPath: "local" })).rejects.toMatchObject({
    code: "SSH_INVALID_OPTIONS",
  });
});

test("injects a logger and writes records without credentials or command text", async () => {
  const levels = ["error", "warn", "info", "http", "verbose", "debug", "silly"];
  const logger = Object.fromEntries(levels.map((level) => [level, jest.fn()]));
  class Client extends EventEmitter {
    connect() {
      this.emit("ready");
    }
    end() {
      this.emit("close");
    }
    exec(_command, callback) {
      const stream = new EventEmitter();
      stream.stderr = new EventEmitter();
      callback(null, stream);
      queueMicrotask(() => stream.emit("close", 0));
    }
  }

  const connection = await connect({
    host: "router",
    privateKey: "private-secret",
    ClientClass: Client,
    logger,
  });
  await expect(connection.exec(["echo command-secret"])).resolves.toMatchObject([{ code: 0 }]);
  await connection.close();

  expect(logger.debug).toHaveBeenCalledWith("connect started", {
    operation: "connect",
    host: "router",
    port: 22,
  });
  expect(logger.info).toHaveBeenCalledWith("connect completed", {
    operation: "connect",
    host: "router",
    port: 22,
  });
  expect(logger.http).toHaveBeenCalledWith(
    "SSH command completed",
    expect.objectContaining({
      operation: "exec",
      host: "router",
      commandCount: 1,
      commandIndex: 1,
      exitCode: 0,
    }),
  );
  expect(JSON.stringify(levels.flatMap((level) => logger[level].mock.calls))).not.toContain(
    "private-secret",
  );
  expect(JSON.stringify(levels.flatMap((level) => logger[level].mock.calls))).not.toContain(
    "command-secret",
  );
});

test("logs a one-shot command through the public API", async () => {
  const logger = Object.fromEntries(
    ["error", "warn", "info", "http", "verbose", "debug", "silly"].map((level) => [
      level,
      jest.fn(),
    ]),
  );
  class Client extends EventEmitter {
    connect() {
      this.emit("ready");
    }
    end() {
      this.emit("close");
    }
    exec(_command, callback) {
      const stream = new EventEmitter();
      stream.stderr = new EventEmitter();
      callback(null, stream);
      queueMicrotask(() => stream.emit("close", 0));
    }
  }

  await expect(
    sshExec({
      host: "router",
      privateKey: "private-secret",
      commands: ["echo command-secret"],
      ClientClass: Client,
      logger,
    }),
  ).resolves.toMatchObject([{ code: 0 }]);
  expect(logger.http).toHaveBeenCalledWith(
    "SSH command completed",
    expect.objectContaining({ operation: "exec", commandIndex: 1, exitCode: 0 }),
  );
  expect(JSON.stringify(logger.http.mock.calls)).not.toContain("command-secret");
  expect(JSON.stringify(logger.http.mock.calls)).not.toContain("private-secret");
});

test("logs one-shot file copies through the public API", async () => {
  const logger = Object.fromEntries(
    ["error", "warn", "info", "http", "verbose", "debug", "silly"].map((level) => [
      level,
      jest.fn(),
    ]),
  );
  class Client extends EventEmitter {
    connect() {
      this.emit("ready");
    }
    end() {
      this.emit("close");
    }
    sftp(callback) {
      callback(null, {
        fastPut: (_local, _remote, _options, done) => done(),
        fastGet: (_remote, _local, done) => done(),
        end() {},
      });
    }
  }
  const options = {
    host: "router",
    privateKey: "private-secret",
    ClientClass: Client,
    logger,
  };

  await expect(
    upload({ ...options, localPath: "local-secret", remotePath: "/remote" }),
  ).resolves.toBeUndefined();
  await expect(
    download({ ...options, remotePath: "/remote", localPath: "local-secret" }),
  ).resolves.toBeUndefined();
  expect(logger.info).toHaveBeenCalledWith("upload completed", {
    operation: "upload",
    host: "router",
    port: 22,
  });
  expect(logger.info).toHaveBeenCalledWith("download completed", {
    operation: "download",
    host: "router",
    port: 22,
  });
  const records = JSON.stringify(logger.info.mock.calls);
  expect(records).not.toContain("private-secret");
  expect(records).not.toContain("local-secret");
  expect(records).not.toContain("/remote");
});
