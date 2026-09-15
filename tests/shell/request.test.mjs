import { expect, test } from '@jest/globals';
import { requestShell } from '../../src/shell/request.mjs';

test('requests shell sessions and normalizes synchronous failures', () => { let callback; requestShell({ shell: value => { callback = value; } }, value => { callback = value; }, error => { throw error; }); expect(callback).toEqual(expect.any(Function)); const errors = []; requestShell({ shell: () => { throw Error('shell'); } }, () => {}, error => errors.push(error)); expect(errors[0]).toMatchObject({ code: 'SSH_SHELL' }); });
