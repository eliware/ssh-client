# Examples

Use [example.mjs](example.mjs) as a starting point for SSH commands.
The command example requires a private key path and a trusted host record.
It prints the command output when the connection succeeds.

Run `node examples/example.mjs` from the repository root.
The command example imports the public API from `src/public-api.mjs`.

Use [integration.mjs](integration.mjs) to check a live SSH connection and SFTP file copy.
Set the required variables in [the environment guide](../docs/environment.md).
Run `node examples/integration.mjs` from the repository root.
The example exits without an error when each check passes.
