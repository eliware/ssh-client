export function closeSftp(sftp) {
  try {
    return sftp?.end?.();
  } catch (error) {
    return error;
  }
}
