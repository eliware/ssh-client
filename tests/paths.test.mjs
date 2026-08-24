import { expect, test } from '@jest/globals';
import { expandPath } from '../src/paths.mjs';
test('expands home-relative paths', () => { expect(expandPath('~/.ssh/known_hosts', () => '/home/test')).toBe('/home/test/.ssh/known_hosts'); expect(expandPath('/tmp/key', () => '/home/test')).toBe('/tmp/key'); });
