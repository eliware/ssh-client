# Copy files

Use `upload()` and `download()` for one file copy.
Use `ssh.upload()` or `ssh.download()` on a long-lived connection.
These file copies use SFTP.
Standalone calls require the same host, authentication, and host verification options as `connect()`.
Calls on a connection use the authentication and host verification options from `connect()`.

## Upload a file

Pass a local path and a remote path.
Set `mode` to apply remote permission bits when required.

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

Set `timeout` in milliseconds to limit a file copy.
The default is `0`, which sets no time limit.
Pass an `AbortSignal` to cancel a file copy.
The client closes the SFTP session when a file copy ends.
The client leaves a long-lived SSH connection open after a file copy.
Read [connections](connections.md) for long-lived connection setup.
