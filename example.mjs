import { sshExec } from './index.mjs';

(async () => {
  try {
    const results = await sshExec({
      host: 'your.ssh.server',
      username: 'youruser', // optional if same as local user
      commands: [
        'echo Hello, SSH!',
        'uname -a',
      ],
    });
    for (const [i, { result, code }] of results.entries()) {
      console.log(`Command #${i + 1} exit code: ${code}`);
      console.log(result);
    }
  } catch (err) {
    console.error('SSH error:', err.message);
  }
})();
