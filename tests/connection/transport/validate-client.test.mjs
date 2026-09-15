import { expect, test } from '@jest/globals';
import { validateClientTransport } from '../../../src/connection/transport/validate-client.mjs';

test('requires once and connect transport methods', () => { expect(() => validateClientTransport({ once() {}, connect() {} })).not.toThrow(); expect(() => validateClientTransport({})).toThrow('transport interface'); });
