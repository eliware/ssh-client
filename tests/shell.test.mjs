import { expect, jest, test } from "@jest/globals";
import { openShell } from "../src/shell.mjs";

function makeStream() {
  const handlers = {};
  const stream = { handlers, close: jest.fn(), end: jest.fn() };
  stream.on = (event, callback) => ((handlers[event] = callback), stream);
  stream.once = (event, callback) => ((handlers[event] = callback), stream);
  return stream;
}

test("opens a shell, forwards data, and closes a late stream", async () => {
  const stream = makeStream();
  let callback;
  const data = jest.fn();
  const client = { shell: (result) => (callback = result), end: jest.fn() };
  const pending = openShell(client, { onData: data });
  callback(null, stream);
  const result = await pending;
  stream.handlers.data(Buffer.from("output"));
  expect(data).toHaveBeenCalledWith(Buffer.from("output"));
  expect(result).toBe(stream);
  const late = makeStream();
  callback(null, late);
  expect(late.close).toHaveBeenCalledTimes(1);
});

test("passes valid terminal settings to the client", async () => {
  const stream = makeStream();
  const client = { shell: (options, callback) => callback(null, stream) };
  await expect(openShell(client, { term: "xterm", cols: 80, rows: 24 })).resolves.toBe(stream);
  stream.handlers.data("ignored");
});

test("rejects invalid options and a cancelled setup", async () => {
  await expect(openShell({}, { timeout: -1 })).rejects.toMatchObject({
    code: "SSH_INVALID_OPTIONS",
  });
  await expect(openShell({}, { term: " " })).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  await expect(openShell({}, { cols: 0 })).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  await expect(openShell({}, { rows: 1.5 })).rejects.toMatchObject({ code: "SSH_INVALID_OPTIONS" });
  const controller = new AbortController();
  controller.abort();
  const client = { end: jest.fn(), shell: jest.fn() };
  await expect(openShell(client, { signal: controller.signal })).rejects.toMatchObject({
    code: "SSH_CANCELLED",
  });
  expect(client.shell).not.toHaveBeenCalled();
});

test("reports callback and synchronous setup errors", async () => {
  const callbackClient = { shell: (callback) => callback(Error("setup")), end: jest.fn() };
  await expect(openShell(callbackClient)).rejects.toMatchObject({ code: "SSH_SHELL" });
  const throwingClient = {
    shell: () => {
      throw Error("sync");
    },
    end: jest.fn(),
  };
  await expect(openShell(throwingClient)).rejects.toMatchObject({ code: "SSH_SHELL" });
});

test("rejects missing streams and reports stream errors only once", async () => {
  await expect(openShell({ shell: (callback) => callback(null) })).rejects.toMatchObject({
    code: "SSH_SHELL",
  });
  const stream = makeStream();
  const pending = openShell(
    { shell: (callback) => callback(null, stream) },
    {
      onInput: (value) => {
        value.handlers.error(Error("stream"));
        value.handlers.error(Error("second"));
      },
    },
  );
  await expect(pending).rejects.toThrow("stream");
  const resolvedStream = makeStream();
  const resolved = openShell({ shell: (callback) => callback(null, resolvedStream) });
  await resolved;
  resolvedStream.handlers.error(Error("late"));
  resolvedStream.handlers.error(Error("second"));
  await expect(resolved).resolves.toBe(resolvedStream);
});
