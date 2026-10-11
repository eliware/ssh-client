export function finishVerification(verification, callback) {
  if (callback) {
    verification.then((value) => {
      try {
        callback(value);
      } catch {}
    });
    return undefined;
  }
  return verification;
}
