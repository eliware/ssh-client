# Environment variables

The library reads environment variables for key and username fallbacks.
The examples also read environment variables for connection settings.
Each default applies when a variable is unset.

## Library fallbacks

| Name                   | Default                                               | Required                                              | Example               |
| ---------------------- | ----------------------------------------------------- | ----------------------------------------------------- | --------------------- |
| `SSH_PRIVATE_KEY_PATH` | Unset. The library then checks its default key files. | No.                                                   | `~/.ssh/id_ed25519`   |
| `USER`                 | Unset.                                                | No. The library checks this before `USERNAME`.        | `operator`            |
| `USERNAME`             | Unset.                                                | No. The library checks this after `USER`.             | `operator`            |
| `SSH_AUTH_SOCK`        | Unset.                                                | No. Pass its value as the `agent` option when needed. | `/path/to/agent.sock` |

When `privateKey` and `privateKeyPath` are unset, the library checks `SSH_PRIVATE_KEY_PATH`.
It then checks `~/.ssh/id_ed25519` and `~/.ssh/id_rsa`.
When `username` is unset, the library uses `USER`, then `USERNAME`.

## Command example

Set `SSH_PRIVATE_KEY_PATH` to a private key file path.
Set `SSH_KNOWN_HOSTS` to a trusted OpenSSH host record.
Both variables are required by [example.mjs](../examples/example.mjs).

| Name                   | Default | Required              | Example                                      |
| ---------------------- | ------- | --------------------- | -------------------------------------------- |
| `SSH_PRIVATE_KEY_PATH` | Unset.  | Yes for this example. | `~/.ssh/id_ed25519`                          |
| `SSH_KNOWN_HOSTS`      | Unset.  | Yes for this example. | `router.example ssh-ed25519 BASE64_HOST_KEY` |

Run `node examples/example.mjs` from the repository root.
The example prints command output and any error details.

## Integration example

Set the integration variables in your shell or CI environment.
The example does not run unless `SSH_CLIENT_INTEGRATION` equals `1`.
Use placeholder values in documentation and keep credentials in a secret store.

| Name                                 | Default                        | Required                                                      | Example                      |
| ------------------------------------ | ------------------------------ | ------------------------------------------------------------- | ---------------------------- |
| `SSH_CLIENT_INTEGRATION`             | Unset. The example stops.      | Yes to enable the example.                                    | `1`                          |
| `SSH_CLIENT_INTEGRATION_HOST`        | Unset.                         | Yes when enabled.                                             | `router.example`             |
| `SSH_CLIENT_INTEGRATION_USER`        | Unset.                         | Yes when enabled.                                             | `operator`                   |
| `SSH_CLIENT_INTEGRATION_PRIVATE_KEY` | Unset.                         | Required when no password is set.                             | `/path/to/id_ed25519`        |
| `SSH_CLIENT_INTEGRATION_PASSWORD`    | Unset.                         | Required when no private key path is set.                     | `REPLACE_WITH_SECRET`        |
| `SSH_CLIENT_INTEGRATION_KNOWN_HOSTS` | Unset.                         | Required for ordinary server host keys.                       | `/path/to/known_hosts`       |
| `SSH_CLIENT_INTEGRATION_CA`          | Unset.                         | Required when the server presents a host certificate.         | `/path/to/host-ca.pub`       |
| `SSH_CLIENT_INTEGRATION_PORT`        | `22`.                          | No.                                                           | `2222`                       |
| `SSH_CLIENT_INTEGRATION_TRANSPORT`   | The built-in SSH client.       | No.                                                           | `/path/to/custom-client.mjs` |
| `SSH_CLIENT_INTEGRATION_REMOTE_PATH` | A generated file under `/tmp`. | No.                                                           | `/tmp/ssh-client-check.txt`  |
| `SSH_CLIENT_INTEGRATION_CERT`        | Unset.                         | No. Set it with the CA path to test certificate verification. | `/path/to/host-cert.pub`     |

Run `node examples/integration.mjs` from the repository root after you set the required values.
The example checks a command, uploads a file, downloads it, and checks its contents.
When you set the certificate and CA paths, it also checks certificate verification.
The example exits without an error when each check passes.
