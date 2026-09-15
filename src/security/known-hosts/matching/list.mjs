import { matches } from './plain.mjs';

export function matchesList(patterns, hosts) {
  return !patterns.some(pattern => pattern.startsWith('!') && matches(pattern.slice(1), hosts)) && patterns.some(pattern => !pattern.startsWith('!') && matches(pattern, hosts));
}
