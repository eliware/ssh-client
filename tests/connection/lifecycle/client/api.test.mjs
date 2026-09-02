import { expect, jest, test } from '@jest/globals';
import { createReusableClientApi } from '../../../../src/connection/lifecycle/client/api.mjs';

test('exposes open state and rejects operations after close', async () => {
  const client = { end: jest.fn() };
  const api = createReusableClientApi(client, { host: 'router', privateKey: 'KEY' });
  expect(api.state).toBe('open');
  expect(typeof api.exec).toBe('function'); expect(typeof api.shell).toBe('function');
  expect(typeof api.upload).toBe('function'); expect(typeof api.download).toBe('function');
  expect(typeof api.close).toBe('function');
});

test('closes the reusable API when shell setup times out', async () => {
  const client = { end: jest.fn(), shell() {} };
  const api = createReusableClientApi(client, { host: 'router', privateKey: 'KEY' });
  await expect(api.shell({ timeout: 1 })).rejects.toMatchObject({ code: 'SSH_TIMEOUT' });
  expect(api.state).toBe('closed');
});

test('closes the reusable API when an execution times out', async () => {
  const client = {
    on(event, handler) { if (event === 'ready') this.ready = handler; return this; },
    once(event, handler) { if (event === 'ready') this.ready = handler; return this; },
    emit(event) { if (event === 'ready') this.ready?.(); return this; },
    connect() { this.ready(); },
    end: jest.fn(),
    exec() {},
  };
  const api = createReusableClientApi(client, { host: 'router', privateKey: 'KEY' });
  await expect(api.exec(['run'], { commandTimeout: 1 })).rejects.toMatchObject({ code: 'SSH_COMMAND_TIMEOUT' });
  expect(api.state).toBe('closed');
});
