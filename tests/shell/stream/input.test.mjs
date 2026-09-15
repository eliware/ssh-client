import { expect, jest, test } from '@jest/globals';
import { attachStreamInput } from '../../../src/shell/stream/input.mjs';
test('invokes input setup', () => { const stream = {}; const input = jest.fn(); attachStreamInput(stream, input); expect(input).toHaveBeenCalledWith(stream); });
test('maps input failures', () => { const stream = { close: jest.fn() }; expect(() => attachStreamInput(stream, () => { throw Error('bad input'); })).toThrow(/SSH shell input error/); expect(stream.close).toHaveBeenCalled(); });
