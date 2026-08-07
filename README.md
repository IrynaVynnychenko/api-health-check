# Smart API Health & Incident Hub (B2B Dashboard)

A monitoring dashboard for third-party APIs (Stripe, OpenAI, GitHub, Resend, Cloudflare) with automatic anomaly detection and alerts via Webhooks/Telegram.

## Core value

Demonstrates skills in SSE streaming, real-time data handling, and building a complex analytics UI.

## Tech stack

- Next.js (App Router)
- Tailwind CSS
- TanStack Query
- Recharts
- Server-Sent Events (SSE)

## Features

- Live latency and error-rate charts over SSE
- Statuspage polling for critical vendors
- Anomaly detection that opens/resolves incidents
- Telegram Bot alerts (optional)
- OpenAI root-cause summaries from probe logs (optional heuristic fallback)
- Custom webhook ingest endpoint for local testing

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

| Variable | Purpose |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Bot token for incident alerts |
| `TELEGRAM_CHAT_ID` | Chat/channel that receives alerts |
| `OPENAI_API_KEY` | Optional AI summaries |
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini` |
| `ENABLE_CHAOS` | Set `true` to simulate intermittent failures |

## Useful endpoints

- `GET /api/stream` — SSE feed (`snapshot`, `metric`, `incident`, `webhook`)
- `GET /api/services` — latest service snapshots
- `GET /api/metrics?serviceId=stripe` — metric history
- `GET /api/incidents` — incident list
- `POST /api/webhooks/ingest` — custom webhook for testing
- `POST /api/alerts/test` — send a Telegram test message
- `POST /api/monitor/tick` — force a monitor cycle

### Webhook example

```bash
curl -X POST http://localhost:3000/api/webhooks/ingest \
  -H 'Content-Type: application/json' \
  -d '{
    "serviceId": "stripe",
    "event": "payment_api.timeout",
    "latencyMs": 2400,
    "success": false,
    "statusCode": 504,
    "message": "Upstream gateway timeout during checkout"
  }'
```

## CI/CD

GitHub Actions workflows live in `.github/workflows`:

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `ci.yml` | push / PR to `main` | `lint` → `typecheck` → `build` |
| `deploy.yml` | push / PR to `main` | Preview/production deploy to Vercel |

Local quality gate:

```bash
npm run ci
```

### Vercel deploy secrets

Add these repository secrets in GitHub → Settings → Secrets and variables → Actions:

| Secret | Where to get it |
| --- | --- |
| `VERCEL_TOKEN` | [Vercel account tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | `.vercel/project.json` after `npx vercel link` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` after `npx vercel link` |

Until those secrets exist, the Deploy workflow is skipped; CI still runs.

Optional runtime env vars (`TELEGRAM_BOT_TOKEN`, `OPENAI_API_KEY`, etc.) should be set in the Vercel project settings.

Dependabot is enabled for weekly npm and GitHub Actions updates.

## Architecture notes

- In-memory store keeps metrics, incidents, and webhook deliveries for the running Node process
- `src/instrumentation.ts` starts the background monitor on server boot
- Probes hit public Statuspage APIs every 15 seconds and broadcast updates over SSE
