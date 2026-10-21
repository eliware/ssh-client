import { validateUploadMode } from "./validate-upload-mode.mjs";

export function validateTransferOperation(config, operation) {
  if (operation === "upload") validateUploadMode(config);
}
