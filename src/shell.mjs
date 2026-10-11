import { validateShellPty, validateShellTimeout } from "./shell/validation.mjs";
import { attachShellStream } from "./shell/stream.mjs";
import { createShellControl } from "./shell/control.mjs";
import { completeShellSetup } from "./shell/completion.mjs";
import { requestShell } from "./shell/request.mjs";

export function openShell(
  client,
  { onData = () => {}, onInput, signal, timeout = 0, term, cols, rows } = {},
) {
  return new Promise((resolve, reject) => {
    try {
      validateShellTimeout(timeout);
      validateShellPty({ term, cols, rows });
    } catch (error) {
      return reject(error);
    }
    const control = createShellControl(client, signal, timeout, reject);
    if (!control.start()) return;
    let settled = false;
    const handle = (error, stream) => {
      if (settled || control.isSettled()) {
        stream?.close?.();
        return;
      }
      const completed = completeShellSetup({
        error,
        stream,
        settled: () => settled,
        stop: control.stop,
        attach: (value) =>
          attachShellStream(value, {
            onData,
            onInput,
            onError: (cause) => {
              if (!settled) {
                settled = true;
                reject(cause);
              }
            },
          }),
        resolve: (value) => {
          settled = true;
          control.settle();
          resolve(value);
        },
        reject: (cause) => {
          settled = true;
          reject(cause);
        },
      });
      return completed;
    };
    const ptyOptions =
      term === undefined && cols === undefined && rows === undefined
        ? undefined
        : { term, cols, rows };
    requestShell(client, ptyOptions, handle, (error) => {
      settled = true;
      control.stop();
      reject(error);
    });
  });
}
