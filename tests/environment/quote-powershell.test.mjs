import { expect, test } from '@jest/globals';
import { quotePowerShell } from '../../src/environment/quote-powershell.mjs';

test('quotes PowerShell values', () => {
  expect(quotePowerShell("C:\\temp\\it's")).toBe("'C:\\temp\\it''s'");
});
