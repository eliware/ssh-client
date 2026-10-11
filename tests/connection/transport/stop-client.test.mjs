import { expect, test, jest } from "@jest/globals";
import { stopClient } from "../../../src/connection/transport/stop-client.mjs";

test("ends clients and destroys when end throws", () => {
  const destroy = jest.fn();
  stopClient({ end() {} });
  stopClient({
    end() {
      throw Error("end");
    },
    destroy,
  });
  expect(destroy).toHaveBeenCalledTimes(1);
});
