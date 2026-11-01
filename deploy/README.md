# Production deploy (`deploy-production.yml`)

Rebuilds and redeploys **only** the `web` container in the shared
`taha-cms-prod` Docker Compose stack on the production host. `cms`,
`admin`, `db`, `mailpit` and the shared `edge-caddy` are never touched —
the existing `docker-compose.prod.yml` and Caddy routing are reused as-is.

- Every push to `main` runs the `verify` job (lint, tests, build, design
  and SEO validation) — nothing is deployed yet.
- Deploying requires a manual trigger: **Actions → Deploy production →
  Run workflow**. This is deliberate: nothing reaches the live site
  without someone choosing to run it.

## One-time setup (done by the repository owner, not by an agent)

This repo is **public**, so these workflow runs are free (GitHub Actions
has no minute limit on public repos).

### 1. Create a dedicated SSH key for deploys

On your own machine (not by pasting a password anywhere):

```bash
ssh-keygen -t ed25519 -f ./taha-prod-deploy-key -C "github-actions-deploy" -N ""
```

This makes two files: `taha-prod-deploy-key` (private) and
`taha-prod-deploy-key.pub` (public).

### 2. Authorize the public key on the server

As the `deploy` user on the production host:

```bash
cat taha-prod-deploy-key.pub >> ~/.ssh/authorized_keys
```

(Paste the key's contents in; don't type the deploy user's password
anywhere for this.)

### 3. Get the host's known_hosts line

```bash
ssh-keyscan -p 22 45.195.250.145
```

### 4. Add repository secrets

GitHub → this repo → **Settings → Secrets and variables → Actions → New
repository secret**. Add each of these — paste values directly into the
GitHub UI, never into a chat or a file in this repo:

| Secret                 | Value                                                                                                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PROD_SSH_PRIVATE_KEY` | Contents of `taha-prod-deploy-key` (the private key file)                                                                                                                                                  |
| `PROD_SSH_KNOWN_HOSTS` | Output of the `ssh-keyscan` command above                                                                                                                                                                  |
| `PROD_SSH_HOST`        | `45.195.250.145`                                                                                                                                                                                           |
| `PROD_SSH_PORT`        | `22`                                                                                                                                                                                                       |
| `PROD_SSH_USER`        | `deploy`                                                                                                                                                                                                   |
| `PROD_APP_DIR`         | A dedicated checkout directory on the server, e.g. `/home/deploy/public-site-deploy` — created automatically on first run, kept separate from `/home/deploy/prod` (the live compose stack's own directory) |

### 5. (Optional but recommended) Add required reviewers

GitHub → **Settings → Environments → production → Required reviewers**.
This makes the deploy job pause for your approval even after someone
clicks "Run workflow" — an extra confirmation step before anything
touches the live site.

### 6. Delete the local key files

Once the private key is pasted into the GitHub secret, delete
`taha-prod-deploy-key` and `taha-prod-deploy-key.pub` from your machine
(or keep them somewhere private, never in this repo).

## What the workflow actually does

See `.github/workflows/deploy-production.yml` for the exact steps. In
order: checks out the deployed commit into `$PROD_APP_DIR/src` on the
server, builds `taha-web-prod:prod-<short-sha>` from
`deploy/Dockerfile.prod`, copies the built static files into the
`taha-cms-prod_prod_public_html` volume the running container serves
from, fixes the `RELEASE_ID` line in `/home/deploy/.env.prod` (replacing
rather than appending — an earlier manual edit left two `RELEASE_ID=`
lines in that file), then runs
`docker compose -p taha-cms-prod ... up -d --force-recreate web` and
verifies the new container answers on `127.0.0.1:28012`.

## `deploy/Dockerfile.prod` vs `Infra/staging/Dockerfile.public`

The root repo's `Infra/staging/` builds from a combined multi-repo
checkout (backend + admin + public side by side) because staging ran
all three services from one workflow. This repo's `Dockerfile.prod` is
a single-repo build — `web` is deployed on its own — and is otherwise
the same multi-stage `node:22-bookworm` build → `nginx:1.27-alpine`
serve pattern, with the matching `nginx-public.conf` (the edge-deny
manifest map, so revoked paths can still 404 without a rebuild).
