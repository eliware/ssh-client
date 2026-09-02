import { createHmac, timingSafeEqual } from 'node:crypto';

export function matchesHashed(pattern, hosts) {
  const [, , salt, digest] = pattern.split('|');
  if (!salt || !digest) return false;
  const canonical = value => /^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 !== 1 && Buffer.from(value, 'base64').toString('base64') === value;
  if (!canonical(salt) || !canonical(digest)) return false;
  const saltBytes = Buffer.from(salt, 'base64'); const expected = Buffer.from(digest, 'base64');
  if (saltBytes.length !== 20 || expected.length !== 20) return false;
  return hosts.some(host => timingSafeEqual(expected, createHmac('sha1', saltBytes).update(host).digest()));
}
