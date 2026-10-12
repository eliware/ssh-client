import { openShell } from "../../shell.mjs";
import { reusableExec, reusableUpload, reusableDownload } from "../../operations/reusable.mjs";
import { closeOnTransportFailure } from "./failure-state.mjs";
import { unavailableOperation } from "./unavailable.mjs";

export function createReusableOperations({ client, options, state, serialize }) {
  const unavailable = unavailableOperation;
  const admit = (operation, action, queued = false) => {
    if (!state.isOpen()) return unavailable(operation);
    const invoke = () =>
      state.isOpen()
        ? Promise.resolve()
            .then(action)
            .catch((error) => {
              closeOnTransportFailure(state, error);
              throw error;
            })
        : unavailable(operation);
    return queued ? serialize(invoke) : invoke();
  };
  return {
    exec: (commands, callOptions = {}) =>
      admit("exec", () => reusableExec(client, options, commands, callOptions), true),
    shell: (shellOptions) =>
      admit("shell", () =>
        openShell(
          client,
          shellOptions && typeof shellOptions === "object" ? shellOptions : {},
        ).then((session) => {
          session.completion?.catch((error) => {
            closeOnTransportFailure(state, error);
          });
          return session;
        }),
      ),
    upload: (transferOptions) =>
      admit("upload", () => reusableUpload(client, transferOptions), true),
    download: (transferOptions) =>
      admit("download", () => reusableDownload(client, transferOptions), true),
  };
}
