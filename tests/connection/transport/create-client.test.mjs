import { expect, test } from '@jest/globals';
import { createClient } from '../../../src/connection/transport/create-client.mjs';

test('constructs the configured client class', () => {
  class Client { constructor() { this.created = true; } }
  expect(createClient(Client)).toEqual({ created: true });
});

test('preserves constructor failures', () => {
  expect(() => createClient(class { constructor() { throw Error('bad client'); } })).toThrow('bad client');
});
