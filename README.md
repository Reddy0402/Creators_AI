# CreatorOS AI

A campaign studio for marketing teams. Enter a brief, generate a campaign strategy with
Groq, then create social posts, ad copy, video scripts and emails that follow that strategy.
Everything you create is saved to PostgreSQL and survives backend restarts and browser refreshes.

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, React Router, Lucide icons
- **Backend:** FastAPI, SQLAlchemy, Pydantic, official Groq Python SDK
- **Database:** PostgreSQL (local or serverless, e.g. Neon). A local SQLite file is still
  used as a fallback when `DATABASE_URL` is unset, for quick throwaway demos.

## Setup

### 1. Backend

Requires Python 3.12 or newer.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # macOS/Linux: cp .env.example .env
```

Open `backend/.env` and set:

- `GROQ_API_KEY` to your key from https://console.groq.com/keys.
- `DATABASE_URL` to your PostgreSQL connection string. This is what makes campaigns
  persistent. Examples:
  - **Local PostgreSQL:** `postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/creatoros`
  - **Neon (serverless):** `postgresql+psycopg://USER:PASSWORD@HOST/neondb?sslmode=require`
    (use Neon's *pooled* connection string, which ends in `-pooler`.)

  Without `DATABASE_URL` the app falls back to a local SQLite file — fine for a demo, but
  data is lost if that file is removed. Prefer PostgreSQL.

Then start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health — also reports `db_ok` and `database`.

If the database can't be reached the API still boots, but `/api/health` shows
`"db_ok": false`, the dashboard shows a warning banner, and data requests return an
actionable 503 explaining what to fix.

### 2. Frontend

Requires Node.js 20 or newer.

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server forwards `/api` requests to the backend on port 8000,
so no CORS or URL configuration is needed in development.

## Environment variables

Backend (`backend/.env`):

| Variable | Default | Purpose |
|---|---|---|
| `GROQ_API_KEY` | *(empty)* | Required for generation. Without it, generation returns a clear error and everything else still works. |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | The only place the model ID is set. Check Groq's model list if it changes. |
| `GROQ_JSON_MODE` | `true` | Asks Groq for a JSON object. Set `false` for models without JSON mode. A rejected JSON-mode request also falls back automatically. |
| `GROQ_TIMEOUT_SECONDS` | `45` | Per-request timeout. |
| `GROQ_MAX_RETRIES` | `2` | Retries for rate limits, timeouts and 5xx errors only. |
| `GROQ_MAX_OUTPUT_TOKENS` | `3000` | Output cap per request. |
| `DATABASE_URL` | *(local SQLite fallback)* | PostgreSQL connection string, e.g. `postgresql+psycopg://user:pass@host:5432/db`. Required for persistent storage. |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin. |
| `MAX_VARIATIONS` | `3` | Upper limit on variations per request. |
| `IMAGE_PROVIDER` | `huggingface` | `huggingface` (FLUX Space, uses `HF_TOKEN`) or `pollinations` (uses `IMAGE_API_KEY`). |
| `HF_TOKEN` | *(empty)* | Hugging Face token for the FLUX Space. Needed when `IMAGE_PROVIDER=huggingface`. |
| `IMAGE_API_KEY` | *(empty)* | Pollinations key. Needed when `IMAGE_PROVIDER=pollinations`. |
| `MAX_UPLOAD_MB` | `5` | Upload size limit for images. |

Frontend (optional, `frontend/.env`):

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Only needed if the API isn't reached through the dev proxy, e.g. `http://localhost:8000/api`. |

Never put a real key in `.env.example` or commit `backend/.env`. Both `.env` files are gitignored.
The API key is only read by the backend and is never returned in responses or logs.

## Database

The app uses **PostgreSQL** when `DATABASE_URL` is set (see the backend environment
variables above). Set it to your local PostgreSQL or a serverless provider such as Neon
(use the **pooled** connection string, which ends in `-pooler`, and include
`?sslmode=require`).

On startup the backend verifies the connection and then:

- creates any missing tables (`Base.metadata.create_all`), and
- additively adds any model columns that are missing on an older database.

Both steps are **non-destructive** — existing rows are never dropped or rewritten. If the
database can't be reached, the app still boots; `/api/health` reports `"db_ok": false`, the
dashboard shows a warning banner, and data requests return an actionable 503.

### Migrations (Alembic)

Schema changes are managed with Alembic so teams can apply them explicitly in shared and
production environments.

```bash
cd backend

# Apply all migrations to the database in DATABASE_URL.
.venv\Scripts\python -m alembic upgrade head          # macOS/Linux: python -m alembic upgrade head

# After changing app/models.py, generate a new migration:
.venv\Scripts\python -m alembic revision --autogenerate -m "describe the change"
.venv\Scripts\python -m alembic upgrade head

# Inspect without changing anything:
.venv\Scripts\python -m alembic current
.venv\Scripts\python -m alembic upgrade head --sql    # print the SQL, don't run it
```

`alembic/env.py` reads the same `DATABASE_URL` as the app (from `backend/.env`), so no
credentials are stored in `alembic.ini`. The initial migration (`alembic/versions/0001_*`)
creates the `campaigns`, `creative_assets`, and `visual_assets` tables.

> The startup auto-creation above is the convenience path for local development and for
> a brand-new database. For a shared/production database you own, prefer `alembic upgrade
> head` so schema changes are explicit and reviewable. The two approaches keep the same
> target schema.

### Resetting local data

- **PostgreSQL:** delete the rows (e.g. `TRUNCATE creative_assets, visual_assets, campaigns RESTART IDENTITY CASCADE;`)
  — never drop the database to fix a problem.
- **SQLite fallback:** stop the backend and delete `backend/data/creatoros.db`.

## API overview

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Status and whether generation is configured |
| GET, POST | `/api/campaigns` | List campaigns (with counts) / create a campaign |
| GET, PATCH, DELETE | `/api/campaigns/{id}` | Read, update (including saving an edited strategy) or delete a campaign |
| POST | `/api/campaigns/{id}/strategy` | Generate a strategy, replacing the previous one |
| GET | `/api/campaigns/{id}/assets` | List a campaign's content |
| POST | `/api/campaigns/{id}/generate-content` | Generate 1 to 3 variations, saved as separate items |
| GET, PATCH, DELETE | `/api/assets/{id}` | Read, edit (content, title, status) or delete a content item |
| POST | `/api/assets/{id}/refine` | Create a revised copy; the original is not changed |

Errors come back as `{"detail": "message"}`. Validation errors also include a `fields` map.

## How generation works

1. `ai/prompts.py` builds the prompt. Trusted rules go in the system message. The user's text is placed
   inside `<campaign_data>` tags and labelled as data, so it can't override the rules.
2. `services/ai_service.py` is the only module that calls Groq. It validates each reply against a
   Pydantic model (`ai/output_models.py`), retries once with a correction request if the JSON is invalid,
   and maps provider errors to clear messages.
3. Nothing is saved unless it validates. A failed regeneration leaves the existing strategy untouched.

## Tests

```bash
cd backend
.venv\Scripts\python -m pytest             # mocked suite, no key or live DB needed
.venv\Scripts\python -m pytest -m live -s  # real Groq calls (GROQ_API_KEY) and real DB tests (DATABASE_URL)
```

The `live` tests include PostgreSQL CRUD/persistence checks in
`tests/test_postgres_live.py`. They run against the real database in `DATABASE_URL`
and only touch rows they create. With no `DATABASE_URL` (or a non-PostgreSQL one)
those specific tests skip, so a plain `pytest` never requires a live database.

```bash
cd frontend
npm test          # unit tests for the API client, copy text and campaign form
npm run build     # type-check and production build
npm run lint
```

## Troubleshooting

- **"Content generation isn't configured"**: `GROQ_API_KEY` is missing or empty in `backend/.env`. Restart the backend after editing it.
- **"The AI provider rejected the configured credentials"**: the key is wrong or revoked. Create a new one at console.groq.com.
- **"The configured model wasn't found"**: `GROQ_MODEL` isn't available for your key. Pick one from the Groq model list.
- **"The AI provider is rate limiting requests"**: wait a minute. Requests are retried automatically a limited number of times.
- **"Can't reach the server"**: the backend isn't running on port 8000.
- **Changes to `.env` aren't picked up**: restart uvicorn; settings are read once at startup.
- **Want a clean database**: stop the backend and delete `backend/data/creatoros.db`.

## Project layout

```
backend/
  app/
    main.py          app setup, CORS, error handling
    config.py        settings from environment variables
    database.py      engine, sessions, table creation
    models.py        SQLAlchemy tables
    schemas.py       API request and response shapes
    errors.py        expected error types with HTTP status codes
    api/             thin route handlers
    services/        business logic and the Groq client (ai_service.py)
    ai/              prompt templates and output models
  tests/             pytest suite (mocked) and live Groq checks
frontend/
  src/
    api/             HTTP client and per-feature API modules
    components/      UI pieces (strategy panel, content cards, forms)
    pages/           dashboard, create campaign, campaign workspace
    lib/ hooks/ types/
```
