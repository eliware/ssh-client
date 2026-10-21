import { sshExec } from "../src/public-api.mjs";

const privateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;
const knownHosts = process.env.SSH_KNOWN_HOSTS;
if (!privateKeyPath || !knownHosts)
  throw new Error("Set SSH_PRIVATE_KEY_PATH and SSH_KNOWN_HOSTS before running this example.");

try {
  const results = await sshExec({
    host: "your.ssh.server",
    username: "youruser",
    privateKeyPath,
    knownHosts,
    connectTimeout: 10_000,
    commandTimeout: 30_000,
    cwd: "/tmp",
    commands: ["echo Hello, SSH!", "uname -a"],
  });

  for (const { command, stdout, stderr, code, duration } of results) {
    console.log(`${command} -> exit ${code} (${duration ?? "n/a"}ms)`);
    console.log(stdout);
    if (stderr) console.error(stderr);
  }
} catch (error) {
  console.error(`SSH error [${error.code ?? "UNKNOWN"}]:`, error.message);
}
