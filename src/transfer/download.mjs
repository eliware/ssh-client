import { validateTransferOptions } from "./options/validate.mjs";
import { invokeDownload } from "./session/invoke-download.mjs";
import { runTransfer } from "./session.mjs";

export function download(client, config) {
  try {
    validateTransferOptions(config, "download", ["remotePath", "localPath"]);
  } catch (error) {
    return Promise.reject(error);
  }
  return runTransfer(client, config, "download", (sftp, done) =>
    invokeDownload(sftp, config, done),
  );
}
