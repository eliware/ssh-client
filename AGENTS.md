# AGENTS.md

## Project

`@eliware/ssh-client` is an ESM-first Node.js SSH command-execution library built on `ssh2`.

## Development

- Use Node.js 26 and npm.
- Keep the package ESM-only; do not add CommonJS entry points.
- Preserve the public `sshExec()` API and TypeScript declarations.
- Keep SSH host verification configurable and avoid weakening verification defaults.
- Never commit private keys, host credentials, webhook URLs, or `.env` files.

## Validation

Run before committing:

```bash
npm test
npm run lint
npm run test:gaps
```

Tests should maintain 100% statements, branches, functions, and lines coverage.

## Changes

- Update `README.md`, `example.mjs`, `index.d.ts`, and release notes when public behavior changes.
- Add focused tests for new options and error paths.
- Do not run release/tag tooling unless explicitly requested.
- Keep commits focused and use descriptive commit messages.
