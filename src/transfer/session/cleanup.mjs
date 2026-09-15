export function closeSftp(sftp) {
  try {
    sftp?.end?.();
    return undefined;
  } catch (error) {
    return error;
  }
}
