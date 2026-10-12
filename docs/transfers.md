# Transfer files

Use `upload()` and `download()` for a single transfer.
Use `ssh.upload()` or `ssh.download()` on a reusable connection.
Transfers use SFTP.

## Upload a file

Pass a local path and a remote path.
Set `mode` to apply a remote permission mask when needed.

```js
import { upload } from "@eliware/ssh-client";

await upload({
  host: "router.example",
  username: "operator",
  privateKeyPath: "~/.ssh/id_ed25519",
  knownHostsPath: "~/.ssh/known_hosts",
  localPath: "./config.txt",
  remotePath: "/tmp/config.txt",
  mode: 0o600,
});
```

## Download a file

Pass a remote path and a local path.

```js
import { download } from "@eliware/ssh-client";

await download({
  host: "router.example",
  username: "operator",
  privateKeyPath: "~/.ssh/id_ed25519",
  knownHostsPath: "~/.ssh/known_hosts",
  remotePath: "/tmp/result.txt",
  localPath: "./result.txt",
});
```

Set `timeout` in milliseconds to limit a transfer.
The default is `0`, which sets no time limit.
Pass an `AbortSignal` to cancel a transfer.
The client closes the SFTP session when a transfer ends.
Read [connections](connections.md) for reusable connection setup.
