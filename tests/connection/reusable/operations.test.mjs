import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";

const openShell = jest.fn();
const reusableExec = jest.fn();
const reusableUpload = jest.fn();
const reusableDownload = jest.fn();
const closeOnTransportFailure = jest.fn();

jest.unstable_mockModule("../../../src/shell.mjs", () => ({ openShell }));
jest.unstable_mockModule("../../../src/operations/reusable.mjs", () => ({
  reusableExec,
  reusableUpload,
  reusableDownload,
}));
jest.unstable_mockModule("../../../src/connection/reusable/failure-state.mjs", () => ({
  closeOnTransportFailure,
}));

const { createReusableOperations } =
  await import("../../../src/connection/reusable/operations.mjs");

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  closeOnTransportFailure.mockImplementation((state, error) => {
    if (["SSH_TIMEOUT", "SSH_SHELL"].includes(error.code)) state.set("closed");
    return error;
  });
  openShell.mockResolvedValue("shell");
  reusableExec.mockResolvedValue("exec");
  reusableUpload.mockResolvedValue("upload");
  reusableDownload.mockResolvedValue("download");
});

afterEach(() => jest.useRealTimers());

function createOperations(state = { isOpen: () => true }, serialize = (invoke) => invoke(), close) {
  return createReusableOperations({
    client: "client",
    options: "options",
    state,
    close,
    serialize,
  });
}

test("runs open operations with their inputs and queue policy", async () => {
  const queued = jest.fn((invoke) => invoke());
  const operations = createOperations(undefined, queued);
  const shellOptions = { terminal: "xterm" };
  await expect(operations.exec(["cmd"], { timeout: 1 })).resolves.toBe("exec");
  await expect(operations.exec("invalid")).resolves.toBe("exec");
  await expect(operations.shell(shellOptions)).resolves.toBe("shell");
  await expect(operations.shell("invalid")).resolves.toBe("shell");
  await expect(operations.upload({ localPath: "a" })).resolves.toBe("upload");
  await expect(operations.download({ remotePath: "b" })).resolves.toBe("download");
  expect(reusableExec).toHaveBeenCalledWith("client", "options", ["cmd"], { timeout: 1 });
  expect(openShell).toHaveBeenNthCalledWith(1, "client", shellOptions);
  expect(openShell).toHaveBeenNthCalledWith(2, "client", {});
  expect(reusableUpload).toHaveBeenCalledWith("client", { localPath: "a" });
  expect(reusableDownload).toHaveBeenCalledWith("client", { remotePath: "b" });
  expect(queued).toHaveBeenCalledTimes(4);
});

test("rejects operations when state is closed", async () => {
  const operations = createOperations({ isOpen: () => false });
  await expect(operations.exec([])).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  await expect(operations.shell()).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  await expect(operations.upload({})).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  await expect(operations.download({})).rejects.toMatchObject({ code: "SSH_CONNECTION" });
});

test("rejects a queued operation when state closes before execution", async () => {
  const state = { isOpen: () => true };
  const operations = createOperations(state, (invoke) => {
    state.isOpen = () => false;
    return invoke();
  });
  await expect(operations.exec([])).rejects.toMatchObject({ code: "SSH_CONNECTION" });
  expect(reusableExec).not.toHaveBeenCalled();
});

test("marks transport failure before it rejects the operation", async () => {
  const failure = Error("transport failure");
  reusableUpload.mockRejectedValue(failure);
  const state = { isOpen: () => true };
  await expect(createOperations(state).upload({})).rejects.toBe(failure);
  expect(closeOnTransportFailure).toHaveBeenCalledWith(state, failure);
});

test.each([
  ["shell", "SSH_TIMEOUT"],
  ["shell", "SSH_EXEC"],
  ["download", "SSH_TIMEOUT"],
  ["download", "SSH_EXEC"],
])("applies transport failure state to %s with %s", async (name, code) => {
  const operation = name === "shell" ? openShell : reusableDownload;
  operation.mockRejectedValueOnce(Object.assign(Error("operation failed"), { code }));
  const state = {
    value: "open",
    isOpen() {
      return this.value === "open";
    },
    set(value) {
      this.value = value;
    },
  };
  const operations = createOperations(state);
  const result = name === "shell" ? operations.shell() : operations.download({});
  await expect(result).rejects.toMatchObject({ code });
  expect(state.value).toBe(code === "SSH_TIMEOUT" ? "closed" : "open");
});

test("closes state when shell setup throws synchronously", async () => {
  const failure = Object.assign(Error("setup timeout"), { code: "SSH_TIMEOUT" });
  openShell.mockImplementationOnce(() => {
    throw failure;
  });
  const state = {
    value: "open",
    isOpen() {
      return this.value === "open";
    },
    set(value) {
      this.value = value;
    },
  };
  await expect(createOperations(state).shell()).rejects.toBe(failure);
  expect(state.value).toBe("closed");
});

test("closes state when an open shell reports a stream failure", async () => {
  let rejectCompletion;
  const completion = new Promise((_, reject) => {
    rejectCompletion = reject;
  });
  openShell.mockResolvedValueOnce({ completion });
  const state = {
    value: "open",
    isOpen() {
      return this.value === "open";
    },
    set(value) {
      this.value = value;
    },
  };
  const session = await createOperations(state).shell();
  const failure = Object.assign(Error("shell stream failed"), { code: "SSH_SHELL" });
  const rejected = expect(session.completion).rejects.toBe(failure);
  rejectCompletion(failure);
  await rejected;
  await Promise.resolve();
  expect(state.value).toBe("closed");
});

test("handles close failure after an open shell stream fails", async () => {
  let rejectCompletion;
  const completion = new Promise((_, reject) => {
    rejectCompletion = reject;
  });
  openShell.mockResolvedValueOnce({ completion });
  const close = jest.fn(() => Promise.reject(Error("close failed")));
  const state = { isOpen: () => true, set: jest.fn() };
  const session = await createOperations(state, undefined, close).shell();
  const failed = expect(session.completion).rejects.toMatchObject({ code: "SSH_SHELL" });
  rejectCompletion(Object.assign(Error("shell stream failed"), { code: "SSH_SHELL" }));
  await failed;
  await Promise.resolve();
  expect(close).toHaveBeenCalledTimes(1);
});
