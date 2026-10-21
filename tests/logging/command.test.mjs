import { expect, jest, test } from "@jest/globals";
import { execOperationMetadata, logCommandResults } from "../../src/logging/command.mjs";

const createLogger = () => Object.fromEntries(["warn", "http"].map((level) => [level, jest.fn()]));

test("builds execution metadata with a command count when commands are an array", () => {
  expect(execOperationMetadata({ host: "router", commands: ["one", "two"] })).toEqual({
    operation: "exec",
    host: "router",
    port: 22,
    commandCount: 2,
  });
  expect(execOperationMetadata({ commands: "one" })).toEqual({ operation: "exec", port: 22 });
  expect(execOperationMetadata()).toEqual({ operation: "exec", port: 22 });
});

test("logs command results without command text", () => {
  const logger = createLogger();
  const metadata = { operation: "exec", host: "router" };
  logCommandResults(logger, metadata, [
    { code: 0, duration: 12, command: "echo secret command" },
    { code: 2, duration: 20, command: "echo another secret" },
  ]);
  expect(logger.http).toHaveBeenCalledWith("SSH command completed", {
    ...metadata,
    commandIndex: 1,
    exitCode: 0,
    duration: 12,
  });
  expect(logger.warn).toHaveBeenCalledWith("SSH command returned a nonzero exit code", {
    ...metadata,
    commandIndex: 2,
    exitCode: 2,
    duration: 20,
  });
  expect(JSON.stringify(logger.http.mock.calls)).not.toContain("secret command");
  expect(JSON.stringify(logger.warn.mock.calls)).not.toContain("another secret");
  expect(() => logCommandResults(logger, metadata, undefined)).not.toThrow();
});
