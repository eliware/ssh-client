import { expect, jest, test, beforeEach } from "@jest/globals";

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
  jest.clearAllMocks();
  closeOnTransportFailure.mockImplementation((state, error) => {
    if (error.code === "SSH_TIMEOUT") state.set("closed");
    return error;
  });
  openShell.mockResolvedValue("shell");
  reusableExec.mockResolvedValue("exec");
  reusableUpload.mockResolvedValue("upload");
  reusableDownload.mockResolvedValue("download");
});

function createOperations(state = { isOpen: () => true }, serialize = (invoke) => invoke()) {
  return createReusableOperations({ client: "client", options: "options", state, serialize });
}

test("runs open operations with their inputs and queue policy", async () => {
  const queued = jest.fn((invoke) => invoke());
  const operations = createOperations(undefined, queued);
  const shellOptions = { terminal: "xterm" };
  await expect(operations.exec(["cmd"], { timeout: 1 })).resolves.toBe("exec");
  await expect(operations.shell(shellOptions)).resolves.toBe("shell");
  await expect(operations.shell("invalid")).resolves.toBe("shell");
  await expect(operations.upload({ localPath: "a" })).resolves.toBe("upload");
  await expect(operations.download({ remotePath: "b" })).resolves.toBe("download");
  expect(reusableExec).toHaveBeenCalledWith("client", "options", ["cmd"], { timeout: 1 });
  expect(openShell).toHaveBeenNthCalledWith(1, "client", shellOptions);
  expect(openShell).toHaveBeenNthCalledWith(2, "client", {});
  expect(reusableUpload).toHaveBeenCalledWith("client", { localPath: "a" });
  expect(reusableDownload).toHaveBeenCalledWith("client", { remotePath: "b" });
  expect(queued).toHaveBeenCalledTimes(3);
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
