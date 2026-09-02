import { expect, test } from '@jest/globals';
import { connect } from '../../../../src/connection/lifecycle/client/connect.mjs';

test('rejects invalid ports and timeout options', async () => {
  await expect(connect({ host: 'router', port: 0 })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(connect({ host: 'router', connectTimeout: 0 })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
});

test('supports agent-only authentication', async () => {
  class AgentClient {
    once(event, fn) { this.handlers ??= {}; this.handlers[event] = fn; if (event === 'ready') queueMicrotask(fn); return this; }
    on() { return this; }
    connect(options) { this.options = options; }
    end() { this.handlers.close?.(); }
  }
  const client = await connect({ host: 'router', agent: 'agent-socket', ClientClass: AgentClient });
  expect(client.state).toBe('open');
  await client.close();
});
