export function expandHomePath(value, homedirFn) {
  return value?.replace(/^~(?=\\|\/|$)/, homedirFn());
}
