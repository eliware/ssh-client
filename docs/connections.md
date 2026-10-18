# Connections and authentication

## Open a long-lived connection

Call `connect()` with host, authentication, and host verification options.
The connection opens before `connect()` resolves.
Call `close()` when your work ends.

```js
import { connect } from "@eliware/ssh-client";

const ssh = await connect({
  host: "router.example",
  username: "operator",
  privateKeyPath: "~/.ssh/id_ed25519",
  knownHostsPath: "~/.ssh/known_hosts",
});

try {
  const results = await ssh.exec(["show version"]);
  console.log(results[0].stdout);
} finally {
  await ssh.close();
}
```

The `state` value is `open`, `closing`, or `closed`.
The client queues `exec`, `upload`, and `download` calls on one connection.
Call `shell()` to open an interactive shell.

## Select authentication

Use `privateKey` for key text in memory.
Use `privateKeyPath` for a key file.
Use `password` for password authentication.
Use `agent` for an SSH agent socket.
Use `passphrase` with an encrypted private key.

When you omit key options, the client checks `SSH_PRIVATE_KEY_PATH` first.
It then checks `~/.ssh/id_ed25519` and `~/.ssh/id_rsa`.
The client uses `USER` or `USERNAME` when you omit `username`.

Set `connectTimeout` in milliseconds to limit connection and authentication time.
The default is `10000` milliseconds.

## Close the connection

Call `await ssh.close()` when your operations end.
The close operation ends the SSH transport and sets `state` to `closed`.
Do not call more operations after close.

Read [host verification](security.md) before you connect.
