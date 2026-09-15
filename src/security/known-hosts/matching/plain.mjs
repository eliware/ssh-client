import { matchesWildcard } from '../wildcard.mjs';
import { matchesHashed } from '../hashed.mjs';

export function matches(pattern, hosts) {
  if (pattern.startsWith('!')) return false;
  if (pattern.startsWith('|1|')) return matchesHashed(pattern, hosts);
  return hosts.some(host => matchesWildcard(pattern, host));
}
