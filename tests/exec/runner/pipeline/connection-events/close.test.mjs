import { expect, jest, test } from "@jest/globals";
import { createTransportCloseHandler } from "../../../../../src/exec/runner/pipeline/connection-events/close.mjs";

function createHandler(overrides = {}) {
  return createTransportCloseHandler({
    getConn: () => ({ end: jest.fn() }),
    finish: jest.fn(),
    isEnded: () => false,
    setTransportClosed: jest.fn(),
    isCommandStarting: () => false,
    isCloseDeferred: () => false,
    deferClose: jest.fn(),
    ...overrides,
  });
}

test("ends and reports an unexpectedly closed idle transport", () => {
  const finish = jest.fn();
  const end = jest.fn();
  const setTransportClosed = jest.fn();
  createHandler({ getConn: () => ({ end }), finish, setTransportClosed })();
  expect(setTransportClosed).toHaveBeenCalledWith(true);
  expect(end).toHaveBeenCalledTimes(1);
  expect(finish).toHaveBeenCalledWith(expect.objectContaining({ code: "SSH_CONNECTION" }));
});

test("defers a transport close during command setup", () => {
  jest.useFakeTimers();
  try {
    let deferred = false;
    const deferClose = jest.fn(() => {
      deferred = true;
    });
    createHandler({
      isCommandStarting: () => true,
      isCloseDeferred: () => deferred,
      deferClose,
    })();
    jest.runAllTimers();
    expect(deferClose).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});

test("reports a repeated transport close during command setup", () => {
  const finish = jest.fn();
  createHandler({
    finish,
    isCommandStarting: () => true,
    isCloseDeferred: () => true,
  })();
  expect(finish).toHaveBeenCalledWith(expect.objectContaining({ code: "SSH_CONNECTION" }));
});

test("does not end a transport that already ended", () => {
  const end = jest.fn();
  const finish = jest.fn();
  createHandler({ getConn: () => ({ end }), finish, isEnded: () => true })();
  expect(end).not.toHaveBeenCalled();
  expect(finish).not.toHaveBeenCalled();
});
