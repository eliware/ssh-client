import { matchesWildcard } from './wildcard.mjs';
import { matchesHashed } from './hashed.mjs';

export function matches(pattern, hosts) {
  if (pattern.startsWith('!')) return false;
  if (pattern.startsWith('|1|')) return matchesHashed(pattern, hosts);
  return hosts.some(host => matchesWildcard(pattern, host));
}
export function matchesList(patterns, hosts) {
  return !patterns.some(pattern => pattern.startsWith('!') && matches(pattern.slice(1), hosts)) && patterns.some(pattern => !pattern.startsWith('!') && matches(pattern, hosts));
}
