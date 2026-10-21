import { expect, test } from "@jest/globals";
import { createClientOperationAdapter } from "../../../src/connection/adapter/operation-adapter.mjs";

test("forwards transport operation methods", () => {
  const calls = [];
  const client = {
    end: () => calls.push("end"),
    destroy: () => calls.push("destroy"),
    exec: (...args) => calls.push(["exec", args]),
    sftp: (...args) => calls.push(["sftp", args]),
  };
  const adapter = createClientOperationAdapter(client);
  adapter.end();
  adapter.destroy();
  adapter.exec("command");
  adapter.sftp("callback");
  expect(calls).toEqual(["end", "destroy", ["exec", ["command"]], ["sftp", ["callback"]]]);
});
