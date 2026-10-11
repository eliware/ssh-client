export function sameKey(record, actual, utils) {
  try {
    return utils.parseKey(record).getPublicSSH().equals(actual.getPublicSSH());
  } catch {
    return false;
  }
}
