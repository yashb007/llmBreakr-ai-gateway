# llmBreakr AI Gateway

A self-hostable AI gateway that sits in front of OpenAI, Gemini, and Anthropic, giving you a single OpenAI-compatible API, virtual keys, per-project model routing, usage limits, and audit logging — without sending your traffic through a third-party SaaS.

## Features

- **Unified chat API** — one OpenAI-compatible endpoint (`/v1/chat/completions`, streaming included) that proxies to OpenAI, Gemini, and Anthropic today, with more providers and features on the way (see [Roadmap](#roadmap))
- **Virtual keys** — issue scoped API keys per project/consumer instead of sharing raw provider keys, with an approval workflow before a key goes live
- **Projects & model routing** — group consumers into projects and control exactly which provider models each project is allowed to call
- **Limits & quotas** — request-rate and budget enforcement per project, checked on every request before it reaches the provider
- **Usage logging & audit logs** — every chat request and every admin action is logged for later review
- **RBAC** — role/permission-based access control for admin users
- **Admin dashboard** — Next.js UI for managing projects, virtual keys, provider credentials, models, users/roles, and logs

## Architecture

```
server/
  admin/       # control plane: auth, projects, virtual keys, credentials, audit logs
  dataplane/   # the actual LLM proxy: chat requests, limit enforcement, model resolution
  providers/   # OpenAI / Gemini / Anthropic adapters
  middlewares/ # shared auth (admin JWT) middleware
  models/      # Sequelize models
  scripts/     # one-off DB migration scripts (see "Database" below)
web/           # Next.js admin dashboard
```

Both the admin API and the dataplane proxy run in the same Express app (`server/index.js`), mounted at two separate base paths:

| Base path    | Purpose                                                                 | Auth                        |
| ------------ | ------------------------------------------------------------------------ | ---------------------------- |
| `/api/admin` | Control plane — everything you configure from the dashboard             | Admin JWT (`Authorization: Bearer <access_token>`) |
| `/api/data`  | Data plane — the actual LLM proxy your applications call                | Virtual key (`Authorization: Bearer <virtual_key>`) |

`admin/*` and `dataplane/*` are logically separate layers (controller → service → validation) even though they share one process — the data plane is the hot path that forwards chat traffic to providers, and stays out of the admin request/response cycle.

## API quick reference

### Authenticate as an admin
```bash
curl -X POST http://localhost:4000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "..."}'
# -> { access_token, refresh_token, ... }
```
Use the super admin account (`SUPER_ADMIN_EMAIL` from `server/.env`) to log in for the first time, then create projects, provider credentials, and virtual keys from the dashboard or via `/api/admin/*`.

### Call the gateway with a virtual key
```bash
curl -X POST http://localhost:4000/api/data/v1/chat/completions \
  -H "Authorization: Bearer <virtual_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```
Every request runs through `virtualKeyAuth → resolveModel → enforceLimits` before it's forwarded to the provider — the key must be approved and active, the model must be allowed for the key's project, and the project's rate/budget limits must not be exceeded. `model` must be a raw provider model id (e.g. `gpt-4o-mini`, `gemini-1.5-pro`, `claude-3-5-sonnet-...`) that's been enabled for that project. Set `"stream": true` for an SSE stream.

Other useful endpoints: `/api/admin/projects`, `/api/admin/virtual-keys`, `/api/admin/provider-creds`, `/api/admin/models`, `/api/admin/logs`, `/api/admin/usage`, `/api/admin/audit-logs`.

## Tech stack

- Node.js / Express, MySQL (via Sequelize), Redis
- Next.js 15 / React 19 / Tailwind for the admin dashboard

## Getting started

### Prerequisites
- Node.js 18+
- MySQL
- Redis

### 1. Server (admin API + gateway)
```bash
cd server
npm install
cp .env.example .env   # fill in DB, Redis, JWT secret, etc. — see server/.env.example for what each var does
npm run dev
```

### 2. Admin dashboard
```bash
cd web
npm install
cp .env.local.example .env.local
npm run dev
```
The dashboard defaults to talking to the server at `http://localhost:4000` (`EXPRESS_API_URL` in `web/.env.local`).

### Or: run everything with Docker

The whole gateway (API + admin dashboard) ships as a **single image**, built from the one `Dockerfile` at the repo root — it runs both processes in one container (`start.sh` starts `server/index.js` on :4000 and the dashboard on :3000, and stops the container if either one dies). MySQL and Redis stay as separate containers, same as any self-hosted app.

```bash
cp .env.example .env   # fill in DB/JWT/admin secrets
docker compose up --build
```
Gateway API → `http://localhost:4000`, dashboard → `http://localhost:3000`. Both processes share one `.env` — since they run in the same container, `EXPRESS_API_URL` just points at `http://localhost:4000` (baked into the image), so there's no cross-container config to keep in sync. `DB_HOST`/`REDIS_HOST` still point at the `mysql`/`redis` service names and are set in `docker-compose.yml` rather than `.env`, since they only make sense inside this compose network.

### Running the published image (no clone needed)

Every release publishes `ghcr.io/yashb007/llmbreakr-ai-gateway` (and `yashb007/llmbreakr-ai-gateway` on Docker Hub) via [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml). To run it on a server without cloning the repo, you only need `docker-compose.yml` and a real `.env`:
```bash
curl -O https://raw.githubusercontent.com/yashb007/llmBreakr-ai-gateway/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/yashb007/llmBreakr-ai-gateway/main/.env.example
cp .env.example .env   # fill in DB/JWT/admin secrets
IMAGE_TAG=1.0.1 docker compose pull
IMAGE_TAG=1.0.1 docker compose up -d
```
`docker-compose.yml`'s `app` service declares both `build: .` (used when you run `docker compose build`/`up --build` locally, e.g. during development) and `image: ghcr.io/yashb007/llmbreakr-ai-gateway:${IMAGE_TAG:-latest}` (used for `pull`/`up` without `--build`). Omit `IMAGE_TAG` to run `latest`. The `main`-branch URLs above always fetch the current compose file; pin to a release tag (e.g. `/v1.0.1/docker-compose.yml`) instead if you want that file to stop changing under you between deploys.

### Releasing

```bash
git tag v1.0.0
git push origin v1.0.0
```
Pushing a `vX.Y.Z` tag triggers CI to build the root `Dockerfile` and push it to GHCR as both `X.Y.Z` and `latest`. Requires GHCR to be public (or the server to `docker login ghcr.io`) — a brand-new package defaults to private on first push, so make it public once in the repo's Packages settings after the first release.

Also mirrors to Docker Hub (`yashbansal0412/llmbreakr-ai-gateway`) once `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are set as repo secrets — until then that step is skipped, not failed, so GHCR publishing isn't blocked on it. To enable it:
1. On Docker Hub, under Account Settings → Security, generate an access token (not your password).
2. In this repo: Settings → Secrets and variables → Actions → New repository secret. Add `DOCKERHUB_USERNAME` = `yashbansal0412` and `DOCKERHUB_TOKEN` = the access token.
3. Next tag push publishes to both registries automatically — no workflow changes needed.

### Database

On every boot, `connectClients()` (`server/config/client.js`) runs `sequelize.sync()` to create/update tables from `server/models`, then seeds a super admin using `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_NAME` from `server/.env` — so a fresh database just works on first `npm run dev`, no manual migration step needed.

There's no formal migration framework beyond that — one-off schema changes that `sync()` can't express (backfills, column renames, etc.) live as scripts under `server/scripts/` (e.g. `add-project-budget-column.js`). Run new scripts manually with `node server/scripts/<script>.js` after pulling changes that add one. If you ever need to reset the super admin password, see `server/scripts/reset-admin-password.js`.

## Roadmap

Provider support today is OpenAI, Gemini, and Anthropic. More providers (and more gateway features beyond routing/limits/logging) are planned — contributions adding new provider adapters under `server/providers/` are welcome.

This repo is the self-hosted, MIT-licensed gateway. A managed SaaS version and additional enterprise capabilities are planned separately — self-hosting the full open-source gateway will always remain supported.

Publishing built server/web images to a container registry (GHCR) via CI is planned, so self-hosting will only require `docker pull` + a compose file — no clone needed.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
