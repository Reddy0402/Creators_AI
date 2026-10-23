# CreatorOS AI

A campaign studio for marketing teams. Enter a brief, generate a campaign strategy with
Groq, then create social posts, ad copy, video scripts and emails that follow that strategy.
Everything you create is saved to SQLite and survives backend restarts.

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, React Router, Lucide icons
- **Backend:** FastAPI, SQLAlchemy, Pydantic, official Groq Python SDK
- **Database:** SQLite (created automatically on first start)

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

Open `backend/.env` and set `GROQ_API_KEY` to your key from https://console.groq.com/keys.
Then start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

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
| `DATABASE_URL` | `sqlite:///backend/data/creatoros.db` | Database location. |
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

Tables are created on backend startup (`Base.metadata.create_all`). There are no migrations yet.
To reset all data, stop the backend and delete `backend/data/creatoros.db`.
Data survives normal restarts because the file stays on disk.

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
.venv\Scripts\python -m pytest             # 49 tests, Groq is mocked, no key needed
.venv\Scripts\python -m pytest -m live -s  # real Groq calls, needs GROQ_API_KEY, uses a little quota
```

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
