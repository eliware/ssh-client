# Troubleshoot errors

## Check the options

Confirm that `host` is set and `port` is between 1 and 65535.
Confirm that `commands` is an array of strings for `sshExec`.
Check each required file path and option value.

## Check host verification

Confirm that the host name and port match the known-host record.
Confirm that the record key matches the SSH server key.
For a host certificate, confirm that its principal includes the host name or IP address.
Check that the certificate is valid now and that its CA key is trusted.
Read [host verification](security.md) for supported records.

## Check authentication

Confirm that the key path exists and that the key is readable.
Pass `passphrase` when the key requires one.
Confirm that the username and password match the SSH account.
Confirm that `SSH_AUTH_SOCK` points to an active agent when you use `agent`.

## Check a timeout

Increase `connectTimeout` when the SSH handshake or authentication needs more time.
Increase `commandTimeout` when a command needs more time.
Use `timeout` as an alias for `commandTimeout` in `sshExec` options.
Check network access before you increase a timeout.

## Check an error code

Read the error code and `context` fields before you handle an error.
See [API errors](api.md#errors) for error codes.
