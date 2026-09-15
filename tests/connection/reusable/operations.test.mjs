import { expect, jest, test } from '@jest/globals';
import { createReusableOperations } from '../../../src/connection/reusable/operations.mjs';

test('rejects operations when state is closed', async () => {
  const state = { isOpen: () => false, set: jest.fn() }; const operations = createReusableOperations({ client: {}, options: {}, state, serialize: jest.fn() });
  await expect(operations.exec([])).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
  await expect(operations.shell()).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
  await expect(operations.upload({})).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
  await expect(operations.download({})).rejects.toMatchObject({ code: 'SSH_CONNECTION' });
  expect(state.set).not.toHaveBeenCalled();
});
