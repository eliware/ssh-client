import { claimTransferSettlement } from "./state.mjs";
import { SshError } from "../../errors.mjs";

export function settleTransfer({
  state,
  cleanup,
  sftp,
  operation,
  error,
  result,
  closeSftp,
  normalizeTransferError,
  resolve,
  reject,
}) {
  if (!claimTransferSettlement(state)) return false;
  cleanup();
  const closeError = closeSftp(sftp);
  const finalError =
    !error && closeError
      ? new SshError(`${operation} session close failed`, "SSH_SFTP", closeError, {
          operation,
          phase: "cleanup",
        })
      : error;
  if (!finalError) resolve(result);
  else reject(normalizeTransferError(operation, finalError));
  return true;
}
