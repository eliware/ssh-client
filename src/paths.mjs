export function expandPath(value, homedirFn) { return value?.replace(/^~(?=\\|\/|$)/, homedirFn()); }
