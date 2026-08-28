# API Consumer Contract

Canonical endpoint and error rules live in `../../../../Docs/03-contracts/`. This repository consumes only documented public resources.

- Generate or hand-maintain types only from an accepted API snapshot.
- Set explicit timeouts and distinguish network, HTTP, validation, and unavailable errors.
- Do not silently replace API failures with fabricated content.
- Keep cache and revalidation behavior visible in architecture decisions.
- Preserve locale and publication filters defined by the server.
- Make contact submissions idempotent from the user's perspective and avoid duplicate sends.

Contract drift must fail CI or a contract test; it must not be discovered only in production rendering.
