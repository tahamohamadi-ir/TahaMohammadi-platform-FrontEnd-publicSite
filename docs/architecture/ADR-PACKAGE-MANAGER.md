# ADR: Package Manager — npm

## Status

Accepted (Wave 0 scaffold)

## Context

The public site is a greenfield Astro project in an independent Git repository. The platform task board requires a committed lockfile and a documented package-manager choice before feature work proceeds.

## Decision

Use **npm** as the sole package manager for `Front-End/public-site/`.

## Rationale

- npm ships with Node.js and is available on every developer machine without extra tooling.
- The platform task board and CI examples already assume npm-style commands (`npm ci`, `npm run build`).
- npm lockfiles (`package-lock.json`) provide reproducible installs for GitHub Actions and local disposable environments.
- The public site has no monorepo workspace coupling that would require pnpm or yarn workspaces in Wave 0.

## Consequences

- Commit `package-lock.json`; do not commit `node_modules/`.
- Document scripts in `package.json` as the authoritative local commands.
- Other repositories (`Back-End`, `Front-End/admin-panel`) may choose different managers; do not assume a shared workspace root.

## Alternatives considered

| Option | Why not chosen (Wave 0)                                                                |
| ------ | -------------------------------------------------------------------------------------- |
| pnpm   | Faster installs, but adds a prerequisite not required for this single-package repo yet |
| yarn   | Same as pnpm; no cross-repo workspace need today                                       |
| bun    | Not required for static Astro output; less predictable in CI for this team baseline    |

## References

- `TASK-LIST.md` — PUBLIC-010, PUBLIC-013
- `Docs/05-delivery/MULTI-AGENT-TASK-BOARD.md` — PUBLIC-010
