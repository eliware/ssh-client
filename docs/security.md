# Verify hosts and keep credentials safe

## Verify every host

Set `knownHosts`, `knownHostsPath`, `hostCaPath`, or `hostVerifier`.
The default SSH client rejects a connection without a host verification option.
Do not accept a host key from an untrusted source.
Set one verification option for each connection that uses the default SSH client.

## Use known-host records

Use an OpenSSH known-host file with `knownHostsPath`.
Use `knownHosts` when you provide the record text in your application.
The client supports plain, wildcard, hashed, revoked, and certificate-authority records.
The record must match the host and endpoint number.
Use the host name alone for endpoint number 22.
For all other endpoint numbers, use the OpenSSH name `[host]:<number>`.

```js
const options = {
  host: "router.example",
  port: 22,
  knownHostsPath: "~/.ssh/known_hosts",
};
```

## Use host certificates

Use an `@cert-authority` record in a known-host file, or set `hostCaPath` to a file of CA public keys.
Use one public key record on each line in a CA file.
Trust a certificate only when a trusted CA signed it.
Match its host identity to the host name or `[host]:<number>` value.

Check that its valid period includes the current time.
The client rejects certificates with unsupported options or extensions because it does not apply them.
The client supports Ed25519, RSA SHA-2, and ECDSA certificate signatures.

## Use a custom verifier

Pass `hostVerifier` when your application must apply its own trust rules.
Return `true` only when the presented key matches trusted data.
Return `false` when the key does not match trusted data.
The verifier may return a Boolean or a promise that resolves to a Boolean.
The verifier may call its callback with the result.

```js
const hostVerifier = (key) => trustedKeyBytes.equals(key);
```

## Keep credentials safe

Keep private keys and passwords in a secret store or protected file.
Do not put secrets in source code, logs, command text, or public documentation.
Use file permissions that prevent access by other users.
Pass only placeholder data in examples.

Read [connection guidance](connections.md) for authentication options.
