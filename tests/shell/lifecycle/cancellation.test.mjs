import { expect, test, jest } from '@jest/globals';
import { attachShellCancellation } from '../../../src/shell/lifecycle/cancellation.mjs';

test('attaches and handles shell cancellation', () => { const controller = new AbortController(); const cancel = jest.fn(); expect(attachShellCancellation(controller.signal, cancel)).toBe(true); controller.abort(); expect(cancel).toHaveBeenCalledTimes(1); const pre = new AbortController(); pre.abort(); expect(attachShellCancellation(pre.signal, cancel)).toBe(false); });
