# Install and run a command

## Requirements

Use Node.js 26 or later. Use a server that accepts SSH connections.
Get trusted host-key data before you connect. See [host verification](security.md).

## Install

Run this command in your project:

```sh
npm install @eliware/ssh-client
```

## Run one command

Import `sshExec`. Set the host, user, trusted host key, and command.
Replace each example value with data from your SSH service.

```js
import { sshExec } from "@eliware/ssh-client";

const results = await sshExec({
  host: "router.example",
  username: "operator",
  privateKeyPath: "~/.ssh/id_ed25519",
  knownHosts: "router.example ssh-ed25519 REPLACE_WITH_BASE64_HOST_KEY",
  commands: ["show version"],
});

console.log(results[0].stdout);
```

`sshExec` opens a connection, runs commands in order, and closes the connection.
Read [command options](commands.md) for output, timeout, and cancellation details.

## Use a reusable connection

Call `connect` when you need several operations on one connection.
Call `close` when your work ends.

```js
import { connect } from "@eliware/ssh-client";

const ssh = await connect({
  host: "router.example",
  username: "operator",
  privateKeyPath: "~/.ssh/id_ed25519",
  knownHostsPath: "~/.ssh/known_hosts",
});

try {
  const results = await ssh.exec(["show version", "show interfaces"]);
  console.log(results[0].stdout);
} finally {
  await ssh.close();
}
```

The connection also supports shells and SFTP transfers.
Read [connections](connections.md), [shells](shell.md), and [file transfers](transfers.md).

## Load a key

Pass `privateKey` to use key text in memory.
Pass `privateKeyPath` to read a key file.
If you set neither, the client checks `SSH_PRIVATE_KEY_PATH`, `~/.ssh/id_ed25519`, then `~/.ssh/id_rsa`.
Pass `passphrase` when the key needs one.

Keep key text and passwords outside source control.
