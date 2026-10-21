import { fallbackKeySources } from "./fallback-sources.mjs";

export function selectKeySources({ privateKeyPath, homedirFn }) {
  return privateKeyPath ? [privateKeyPath] : fallbackKeySources(homedirFn);
}
