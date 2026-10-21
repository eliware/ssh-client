import { stopClient } from "../transport/stop-client.mjs";

export function createClientOperationAdapter(client) {
  return {
    end() {
      stopClient(client);
    },
    destroy() {
      client.destroy?.();
    },
    exec(...args) {
      return client.exec(...args);
    },
    sftp(...args) {
      return client.sftp(...args);
    },
  };
}
