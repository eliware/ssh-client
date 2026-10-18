# Open an interactive shell

Call `shell()` on a long-lived connection.
Use `onData` to read output and `onInput` to receive the shell stream.

```js
import { connect } from "@eliware/ssh-client";

const ssh = await connect({
  host: "router.example",
  username: "operator",
  privateKeyPath: "~/.ssh/id_ed25519",
  knownHostsPath: "~/.ssh/known_hosts",
});

try {
  const shell = await ssh.shell({
    term: "xterm",
    cols: 100,
    rows: 30,
    onData: (data) => process.stdout.write(data),
    onInput: (stream) => process.stdin.pipe(stream),
  });
  const result = await shell.completion;
  console.log(result.code);
  shell.close();
} finally {
  await ssh.close();
}
```

Pass `term`, `cols`, and `rows` to set pseudo-terminal options.
Set `cols` and `rows` to positive integers.
Set `timeout` in milliseconds to limit shell setup.
The default shell setup limit is `0`, which sets no time limit.
Pass an `AbortSignal` to cancel shell setup.

The shell session is a Node.js read-write stream.
Call `shell.close()` to close the shell session.
Read `shell.completion` to receive the exit code and signal when the shell ends.
Call `ssh.close()` when all work on the connection ends.

Read [connection guidance](connections.md) before you open a shell.
