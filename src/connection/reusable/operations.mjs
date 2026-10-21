import { openShell } from "../../shell.mjs";
import { reusableExec, reusableUpload, reusableDownload } from "../../operations/reusable.mjs";
import { closeOnTransportFailure } from "./failure-state.mjs";
import { unavailableOperation } from "./unavailable.mjs";
import { logCommandResults } from "../../logging/command.mjs";
import { logRecord, operationMetadata, runLoggedOperation } from "../../logging/operation.mjs";

export function createReusableOperations({ client, options, state, close, serialize }) {
  const unavailable = unavailableOperation;
  const admit = (operation, action, queued, details, onSuccess) => {
    const metadata = operationMetadata(operation, options, details);
    const invoke = () =>
      runLoggedOperation(
        options.logger,
        metadata,
        () =>
          state.isOpen()
            ? Promise.resolve()
                .then(action)
                .catch((error) => {
                  closeOnTransportFailure(state, error);
                  throw error;
                })
            : unavailable(operation),
        onSuccess,
      );
    return queued && state.isOpen() ? serialize(invoke) : invoke();
  };
  return {
    exec: (commands, callOptions = {}) =>
      admit(
        "exec",
        () => reusableExec(client, options, commands, callOptions),
        true,
        { commandCount: Array.isArray(commands) ? commands.length : undefined },
        (results, metadata) => logCommandResults(options.logger, metadata, results),
      ),
    shell: (shellOptions) =>
      admit(
        "shell",
        () =>
          openShell(
            client,
            shellOptions && typeof shellOptions === "object" ? shellOptions : {},
          ).then((session) => {
            session.completion?.catch((error) => {
              closeOnTransportFailure(state, error);
              const closing = close?.();
              closing?.catch(() => {});
            });
            return session;
          }),
        false,
        {},
        (_session, metadata) => logRecord(options.logger, "verbose", "SSH shell opened", metadata),
      ),
    upload: (transferOptions) =>
      admit("upload", () => reusableUpload(client, transferOptions), true, {}, undefined),
    download: (transferOptions) =>
      admit("download", () => reusableDownload(client, transferOptions), true, {}, undefined),
  };
}
