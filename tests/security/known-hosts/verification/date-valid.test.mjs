import { expect, test } from '@jest/globals';
import { dateValid } from '../../../../src/security/known-hosts/verification/date-valid.mjs';

test('accepts dates at or before the reference time', () => { expect(dateValid('2000-01-01', new Date('2001-01-01'))).toBe(true); expect(dateValid('2999-01-01', new Date('2000-01-01'))).toBe(false); expect(dateValid(undefined)).toBe(false); expect(dateValid('not-a-date')).toBe(false); });
