import { expect, test } from '@jest/globals';
import { acquireSftp } from '../../../src/transfer/session/acquire-sftp.mjs';

test('acquires SFTP and reports synchronous setup failures', () => {
  const result = []; acquireSftp({ sftp: callback => callback(null, 'handle') }, (...args) => result.push(args)); expect(result).toEqual([[null, 'handle']]);
  acquireSftp({ sftp: () => { throw Error('setup'); } }, (...args) => expect(args[0]).toMatchObject({ message: 'setup' }));
});
