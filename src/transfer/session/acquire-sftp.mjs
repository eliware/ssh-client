export function acquireSftp(client, onResult) {
  try {
    client.sftp(onResult);
  } catch (error) {
    onResult(error);
  }
}
