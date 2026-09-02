import { expect, jest, test } from '@jest/globals';
import { invokeCommand } from '../../../src/exec/commands/invoke.mjs';

test('invokes the transport with the appropriate argument shape', () => {
  const calls = [];
  const client = { exec: (...args) => calls.push(args) };
  const done = jest.fn();
  invokeCommand(client, 'run', { env: undefined, envFallback: undefined, pty: false }, done);
  invokeCommand(client, 'run', { env: { A: '1' }, envFallback: undefined, pty: false }, done);
  invokeCommand(client, 'run', { env: undefined, envFallback: undefined, pty: true }, done);
  invokeCommand(client, 'run', { env: undefined, envFallback: 'posix', pty: false }, done);
  expect(calls).toEqual([['run', done], ['run', { env: { A: '1' }, pty: false }, done], ['run', { pty: true }, done], ['run', { pty: false }, done]]);
});
