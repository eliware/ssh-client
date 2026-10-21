import { acquireSftp } from "./session/acquire-sftp.mjs";
import { closeSftp } from "./session/cleanup.mjs";
import { transferSetupError } from "./session/errors.mjs";
import { createTransferControl } from "./session/control.mjs";

export function runTransfer(client, config, operation, start) {
  const { signal, timeout = 0 } = config;
  return new Promise((resolve, reject) => {
    const control = createTransferControl({ signal, timeout, operation, resolve, reject });
    if (control.isSettled()) return;
    acquireSftp(client, (error, handle) => {
      if (control.isSettled()) {
        closeSftp(handle);
        return;
      }
      if (error || !handle) return control.finish(transferSetupError(operation, error, handle));
      control.setSftp(handle);
      try {
        start(handle, control.finish);
      } catch (cause) {
        control.finish(cause);
      }
    });
  });
}
