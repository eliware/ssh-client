import { expect, jest, test } from '@jest/globals';
import { openShell } from '../../src/shell.mjs';
import { connect } from '../../src/connection/lifecycle/client/connect.mjs';
import { validateShellTimeout } from '../../src/shell/validation.mjs';

test('validates shell options and setup failures', async () => {
  await expect(openShell({}, { timeout: -1 })).rejects.toThrow('timeout');
  const controller = new AbortController();
  controller.abort();
  await expect(openShell({ end: jest.fn() }, { signal: controller.signal })).rejects.toThrow('cancelled');
  await expect(openShell({ shell: () => { throw Error('boom'); } })).rejects.toThrow('boom');
  await expect(openShell({ shell: callback => callback(Error('unavailable')) })).rejects.toThrow(
    'unavailable',
  );
  await expect(openShell({ shell: callback => callback({}) })).rejects.toThrow();
  await expect(openShell({ shell: () => { throw 'string failure'; } })).rejects.toThrow(
    'string failure',
  );
});

test('validates non-negative finite shell timeouts', () => {
  expect(() => validateShellTimeout(0)).not.toThrow();
  expect(() => validateShellTimeout(10)).not.toThrow();
  expect(() => validateShellTimeout(-1)).toThrow('shell timeout');
  expect(() => validateShellTimeout(Infinity)).toThrow('shell timeout');
});

test('validates shell timeout and wraps input failures through a connection', async () => {
  class Shell {
    once(event, fn) { if (event === 'ready') fn(); return this; }
    on() { return this; }
    connect() {}
    end() {}
    shell(callback) { callback(null, { on() { return this; }, close() {} }); }
  }
  const client = await connect({ host: 'router', privateKey: 'KEY', ClientClass: Shell });
  await expect(client.shell({ timeout: -1 })).rejects.toMatchObject({ code: 'SSH_INVALID_OPTIONS' });
  await expect(client.shell({ onInput: () => { throw Error('input'); } })).rejects.toMatchObject({ code: 'SSH_SHELL', context: { phase: 'input' } });
  class NoCloseShell extends Shell { shell(callback) { callback(null, { on() { return this; } }); } }
  const noClose = await connect({ host: 'router', privateKey: 'KEY', ClientClass: NoCloseShell });
  await expect(noClose.shell({ onInput: () => { throw 'input without close'; } })).rejects.toMatchObject({ code: 'SSH_SHELL' });
});
