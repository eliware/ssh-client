import { validateTransferOptions } from "./options/validate.mjs";
import { invokeUpload } from "./session/invoke-upload.mjs";
import { runTransfer } from "./session.mjs";

export function upload(client, config) {
  try {
    validateTransferOptions(config, "upload", ["localPath", "remotePath"]);
  } catch (error) {
    return Promise.reject(error);
  }
  return runTransfer(client, config, "upload", (sftp, done) => invokeUpload(sftp, config, done));
}
