# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: in-house marketing teams planning and executing campaigns across channels. They enter a campaign brief (product, audience, objective, platform, tone), review an AI-generated strategy, then generate and iterate on multi-format copy (social posts, ad copy, video scripts, emails, taglines) and visual assets. Job: take a brief to shippable, on-strategy campaign content in minutes, not days.

Secondary audiences (agencies, solo creators) are not the design focus.

## Product Purpose

CreatorOS AI is a campaign studio: enter a brief, generate a campaign strategy with Groq, then create social posts, ad copy, video scripts, and emails that follow that strategy. Everything is saved to the database and survives backend restarts and browser refreshes. Success: a marketer can go from raw brief to a set of approved, editable assets without leaving the app.

## Positioning

Strategy-first generation: copy is not generated in a vacuum — a structured campaign strategy (positioning, audience, core message, value proposition, concepts, CTAs) is generated and editable first, and all downstream content is grounded in it. Refinement never mutates the original (tracked lineage via `source_asset_id`), so teams can audit creative iterations.

## Operating Context

Workflow: create campaign → generate/edit strategy → generate 1–3 variations per content type → refine (shorten, expand, tone shifts, platform adaptation) → approve assets. Runs locally (backend on :8000, frontend on :5173 with `/api` dev proxy) and is deployable to Vercel (`vercel.json`). Generation requires `GROQ_API_KEY`; without it the app still works and reports a clear configuration error.

## Capabilities and Constraints

- Frontend: React 19 + TypeScript + Vite + Tailwind CSS + React Router v6 + Lucide icons. Pages: Dashboard, Create Campaign, Campaign Workspace (Strategy Studio, multi-format copy gen, tagline engine, image generation, asset gallery).
- Backend: FastAPI (Python 3.12+), SQLAlchemy, Pydantic v2, official Groq SDK. Model default `openai/gpt-oss-120b`, set only in `GROQ_MODEL`.
- Database: PostgreSQL when `DATABASE_URL` is set (Neon serverless supported, pooled connection string); local SQLite fallback for throwaway demos. Alembic migrations for shared/production schemas.
- Images: Hugging Face FLUX Space or Pollinations provider; aspect ratios 1:1, 16:9, 9:16, 4:5; uploads limited to 5 MB.
- AI safety: strict Pydantic validation with one auto-correction retry; prompt-injection defense via system-message segregation and `<campaign_data>` data tagging; anti-hallucination placeholders instead of fabricated claims.
- Max 3 variations per generation request (`MAX_VARIATIONS`).
- The app boots without a database and degrades gracefully: health endpoint reports `db_ok: false`, dashboard shows a warning banner, data requests return actionable 503s.

## Evidence on Hand

- `README.md` — quickstart, env vars, API overview, troubleshooting.
- `PROJECT_DETAILS.md` — full architecture, schema, security model, API reference.
- `PLAN.md` — project plan.
- Backend test suite (49+ mocked unit tests, live markers) and frontend unit tests exist.
- No real customer names, testimonials, case studies, benchmarks, or pricing exist. Future work must not fabricate any of these.

## Product Principles

1. Strategy before content — nothing is generated without the editable strategy as its anchor.
2. Originals are never mutated — refinements create tracked variants, preserving creative lineage.
3. Honest degradation — missing keys or database means clear, actionable errors, not silent failures or fake data.
4. Grounded claims — the AI states only what the brief provides; gaps become placeholders, never invented stats.
5. Everything persists — work survives refreshes and restarts; a user never loses a session of generated assets.
