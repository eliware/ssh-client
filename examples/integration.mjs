import { promises as fs } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ssh2 from "@eliware/ssh2";
import { connect, createHostVerifier } from "@eliware/ssh-client";

const enabled =
  process.env.SSH_CLIENT_INTEGRATION === "1" &&
  process.env.SSH_CLIENT_INTEGRATION_HOST &&
  process.env.SSH_CLIENT_INTEGRATION_USER &&
  (process.env.SSH_CLIENT_INTEGRATION_PRIVATE_KEY || process.env.SSH_CLIENT_INTEGRATION_PASSWORD) &&
  (process.env.SSH_CLIENT_INTEGRATION_KNOWN_HOSTS || process.env.SSH_CLIENT_INTEGRATION_CA);

if (!enabled) throw Error("Set the SSH_CLIENT_INTEGRATION variables before running this example.");

const transport = process.env.SSH_CLIENT_INTEGRATION_TRANSPORT
  ? (await import(pathToFileURL(process.env.SSH_CLIENT_INTEGRATION_TRANSPORT))).default
  : undefined;
const client = await connect({
  host: process.env.SSH_CLIENT_INTEGRATION_HOST,
  port: Number(process.env.SSH_CLIENT_INTEGRATION_PORT || 22),
  username: process.env.SSH_CLIENT_INTEGRATION_USER,
  privateKeyPath: process.env.SSH_CLIENT_INTEGRATION_PRIVATE_KEY,
  password: process.env.SSH_CLIENT_INTEGRATION_PASSWORD,
  knownHostsPath: process.env.SSH_CLIENT_INTEGRATION_KNOWN_HOSTS,
  hostCaPath: process.env.SSH_CLIENT_INTEGRATION_CA,
  ClientClass: transport,
});
const source = join(await fs.mkdtemp(join(tmpdir(), "ssh-client-integration-")), "source.txt");
const copy = `${source}.copy`;
const remote =
  process.env.SSH_CLIENT_INTEGRATION_REMOTE_PATH || `/tmp/ssh-client-${Date.now()}.txt`;
await fs.writeFile(source, "ssh-client integration\n");

try {
  const [result] = await client.exec(["echo integration"]);
  if (result.code !== 0 || !result.stdout.includes("integration"))
    throw Error("Command check failed.");
  await client.upload({ localPath: source, remotePath: remote });
  await client.download({ remotePath: remote, localPath: copy });
  if ((await fs.readFile(copy, "utf8")) !== "ssh-client integration\n")
    throw Error("File copy check failed.");

  const certPath = process.env.SSH_CLIENT_INTEGRATION_CERT;
  const caPath = process.env.SSH_CLIENT_INTEGRATION_CA;
  if (certPath && caPath) {
    const encoded = (await fs.readFile(certPath, "utf8")).trim().split(/\s+/)[1];
    const valid = Buffer.from(encoded, "base64");
    const invalid = Buffer.from(valid);
    invalid[invalid.length - 1] ^= 1;
    const verifier = createHostVerifier({
      host: process.env.SSH_CLIENT_INTEGRATION_HOST,
      port: Number(process.env.SSH_CLIENT_INTEGRATION_PORT || 22),
      hostCaPath: caPath,
      fsLib: fs,
      homedirFn: homedir,
      utils: ssh2.utils,
    });
    if (!(await verifier(valid)) || (await verifier(invalid)))
      throw Error("Certificate check failed.");
  }
} finally {
  await client.close();
  await fs.rm(source, { force: true });
  await fs.rm(copy, { force: true });
}
