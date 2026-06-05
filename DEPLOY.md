# Deploying SkyRoute

Two apps: **backend** (Express + Prisma) and **frontend** (Next.js).
Recommended: **Vercel** (frontend) + **Render** (backend + managed Postgres).

Local dev stays on SQLite — nothing here changes that. The Postgres switch only
runs during a production build (`npm run build:prod` runs `scripts/use-postgres.mjs`).

---

## Option A — Vercel + Render (recommended)

### 1. Backend → Render (with Postgres)
1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo. It reads `render.yaml`:
   - provisions a free **Postgres**,
   - builds the backend (`npm run build:prod` → switches Prisma to Postgres),
   - `preDeploy` runs `prisma db push` + seeds tours,
   - starts on `/api/health`.
3. After the first deploy, open the backend service → **Environment** and set:
   - `CORS_ORIGIN` = your Vercel URL (e.g. `https://your-app.vercel.app`)
   - `ADMIN_EMAILS` = your admin email
   - (optional) `SMTP_*` for real email, `STRIPE_SECRET_KEY` for real payments
   - Redeploy.
4. Note the backend URL (e.g. `https://skyroute-backend.onrender.com`).

### 2. Frontend → Vercel
1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory** = `frontend`.
3. Env var: `NEXT_PUBLIC_API_URL` = your Render backend URL.
4. Deploy.

Done. Visit the Vercel URL.

---

## Option B — Docker (local prod or any VPS)

```bash
docker compose up --build
# frontend  http://localhost:3000
# backend   http://localhost:4000/api/health
```

Compose runs Postgres + backend + frontend. The backend container switches Prisma
to Postgres, pushes the schema and seeds tours on start.

On a VPS: same command, then put Nginx/Caddy in front for TLS and set real
`NEXT_PUBLIC_API_URL`, `CORS_ORIGIN`, secrets.

---

## Environment variables

**Backend** (`backend/.env.example`): `DATABASE_URL`, `JWT_SECRET`, `OTP_SECRET`,
`CORS_ORIGIN`, `ADMIN_EMAILS`, `MAIL_FROM`; optional `SMTP_*`, `STRIPE_SECRET_KEY`,
`IRCTC_API_KEY`.

**Frontend** (`frontend/.env.example`): `NEXT_PUBLIC_API_URL`.

---

## Notes / gotchas
- **Use strong secrets** in prod (`JWT_SECRET`, `OTP_SECRET`) — not the dev values.
- **`CORS_ORIGIN` must equal your real frontend URL**, or API calls are blocked.
- **No `SMTP_*`** → OTP codes only print to backend logs (dev console transport).
- **SQLite won't persist** on Render/Vercel free filesystems — that's why prod uses Postgres.
- Real airport/train datasets ship in the repo; the seed only adds the 8 tours.
- Switch a schema back to SQLite locally: it already is — `scripts/use-postgres.mjs`
  only edits the schema during prod builds, not your checkout.
