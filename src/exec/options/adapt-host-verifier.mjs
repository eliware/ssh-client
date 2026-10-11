export function adaptHostVerifier(verifier) {
  return (key, callback) => {
    let settled = false;
    const complete = (value) => {
      if (settled) return;
      settled = true;
      callback(value === true);
    };
    try {
      const result = verifier(key, complete);
      if (typeof result === "boolean") complete(result);
      else if (result?.then) result.then(complete, () => complete(false));
    } catch {
      complete(false);
    }
    return undefined;
  };
}
