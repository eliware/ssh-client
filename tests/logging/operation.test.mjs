import { expect, jest, test } from "@jest/globals";
import { logRecord, operationMetadata, runLoggedOperation } from "../../src/logging/operation.mjs";

const levels = ["error", "warn", "info", "http", "verbose", "debug", "silly"];
const createLogger = () => Object.fromEntries(levels.map((level) => [level, jest.fn()]));

test("builds safe operation metadata with default and supplied connection details", () => {
  expect(operationMetadata("connect")).toEqual({ operation: "connect", port: 22 });
  expect(operationMetadata("exec", { host: "router", port: 2200 }, { commandCount: 2 })).toEqual({
    operation: "exec",
    host: "router",
    port: 2200,
    commandCount: 2,
  });
});

test("writes structured records and skips missing or failing logger methods", () => {
  const logger = createLogger();
  const metadata = { operation: "connect", host: "router" };
  logRecord(logger, "info", "connection ready", metadata);
  expect(logger.info).toHaveBeenCalledWith("connection ready", metadata);
  expect(() => logRecord(undefined, "info", "connection ready", metadata)).not.toThrow();
  expect(() => logRecord({}, "info", "connection ready", metadata)).not.toThrow();
  expect(() =>
    logRecord(
      {
        info: () => {
          throw Error("logger failure");
        },
      },
      "info",
      "message",
      {},
    ),
  ).not.toThrow();
});

test("records operation completion and safe failure context", async () => {
  const logger = createLogger();
  const metadata = { operation: "exec", host: "router", commandCount: 1 };
  await expect(runLoggedOperation(logger, metadata, async () => "done")).resolves.toBe("done");
  expect(logger.debug).toHaveBeenCalledWith("exec started", metadata);
  expect(logger.info).toHaveBeenCalledWith("exec completed", metadata);

  const failure = Object.assign(Error("secret message"), {
    code: "SSH_AUTHENTICATION",
    context: { phase: "connect", password: "secret" },
  });
  await expect(
    runLoggedOperation(logger, metadata, async () => {
      throw failure;
    }),
  ).rejects.toBe(failure);
  expect(logger.error).toHaveBeenCalledWith("exec failed", {
    ...metadata,
    errorName: "Error",
    errorCode: "SSH_AUTHENTICATION",
    phase: "connect",
  });
  expect(JSON.stringify(logger.error.mock.calls)).not.toContain("secret");
  const plainFailure = {};
  await expect(
    runLoggedOperation(logger, metadata, async () => {
      throw plainFailure;
    }),
  ).rejects.toBe(plainFailure);
});
