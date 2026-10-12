# Verify hosts and protect credentials

## Verify every host

Set `knownHosts`, `knownHostsPath`, `hostCaPath`, or `hostVerifier`.
The default SSH client rejects a connection without a host verification option.
Do not accept a host key from an untrusted source.

## Use known-host records

Use an OpenSSH known-host file with `knownHostsPath`.
Use `knownHosts` when you provide the record text in your application.
The client supports plain, wildcard, hashed, revoked, and certificate-authority records.
The host name and port must match the record.
Port 22 uses the host name alone.
Other ports use the OpenSSH form `[host]:port`.

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
Match its principal to the host name or `[host]:port` value.
Check that its validity period includes the current time.
The client rejects certificates with critical options because it does not enforce them.

## Use a custom verifier

Pass `hostVerifier` when your application must apply its own trust rules.
Return `true` only when the presented key matches trusted data.
Return `false` when the key does not match trusted data.
The verifier may also call its callback or return a promise.

```js
const hostVerifier = (key) => trustedKeyBytes.equals(key);
```

## Protect credentials

Keep private keys and passwords in a secret store or protected file.
Do not put secrets in source code, logs, command text, or public documentation.
Use file permissions that prevent access by other users.
Pass only placeholder data in examples.

Read [connection guidance](connections.md) for authentication options.
