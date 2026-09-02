import { SshError } from '../../../errors.mjs';

export function closeConnection(client, setState) {
  return new Promise((resolve, reject) => { setState('closing'); let settled = false; const finish = error => { if (settled) return; settled = true; clearTimeout(fallback); setState('closed'); if (error) reject(new SshError('SSH connection close failed', 'SSH_CONNECTION', error, { operation: 'close', phase: 'cleanup' })); else resolve(); }; const destroySafely = () => { try { client.destroy?.(); } catch {} }; const fallback = setTimeout(() => { destroySafely(); finish(); }, 1000); client.once('close', () => finish()); client.once('end', () => { destroySafely(); finish(); }); client.once('error', error => finish(error)); try { client.end(); } catch { destroySafely(); finish(); } });
}
