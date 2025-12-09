import { Client } from 'ssh2';
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Execute commands on a remote SSH server using private key authentication only.
 * @param {Object} options
 * @param {string} options.host - Hostname or IP address
 * @param {number} [options.port=22] - SSH port
 * @param {string} [options.username] - SSH username (defaults to current user)
 * @param {string[]} options.commands - List of commands to execute
 * @param {any} [options.ClientClass] - For testing/mocking only
 * @returns {Promise<Array<{result: string, code: number}>>}
 */
export async function sshExec({
  host,
  port = 22,
  username = process.env.USER || process.env.USERNAME,
  commands,
  ClientClass = Client,
  fsLib = fs,
  homedirFn = homedir,
} = {}) {
  if (!host || !commands || !Array.isArray(commands)) {
    throw new Error('host and commands[] are required');
  }

  let privateKey;
  const sshDir = join(homedirFn(), '.ssh');
  for (const keyFile of ['id_ed25519', 'id_rsa']) {
    try {
      privateKey = await fsLib.readFile(join(sshDir, keyFile), 'utf8');
      break;
    } catch { }
  }
  if (!privateKey) throw new Error('No private key found in ~/.ssh/');

  return await new Promise((resolve, reject) => {
    const conn = new ClientClass();
    const results = [];
    let i = 0;
    let ended = false;
    function runNext() {
      if (i >= commands.length) {
        conn.end();
        ended = true;
        return resolve(results);
      }
      const command = commands[i++];
      let result = '';
      conn.exec(command, (err, stream) => {
        if (err) {
          if (!ended) conn.end();
          return reject(new Error(`SSH exec error: ${err.message}`));
        }
        stream.on('close', (code) => {
          results.push({ result, code });
          runNext();
        }).on('data', (data) => {
          result += data;
        }).stderr.on('data', (data) => {
          result += data;
        });
      });
    }
    conn.on('ready', runNext)
      .on('error', (err) => {
        if (!ended) conn.end();
        if (err.level === 'client-authentication') {
          reject(new Error('SSH authentication failed: ' + err.message));
        } else if (err.level === 'client-timeout') {
          reject(new Error('SSH connection timed out: ' + err.message));
        } else {
          reject(new Error('SSH connection error: ' + err.message));
        }
      })
      .on('end', () => { ended = true; })
      .on('close', () => { ended = true; })
      .connect({
        host,
        port,
        username,
        privateKey,
      });
  });
}
