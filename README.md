# SkillBridge AI

Smart Job Discovery now joins internal demonstration vacancies with an authorization-gated Jooble Malaysia connector. See [docs/JOB_AGGREGATOR.md](docs/JOB_AGGREGATOR.md) for setup, safeguards, provider status, and limitations.

SkillBridge AI is a working, local-first skills-based talent matching MVP for the Malaysian employment context. It compares candidate capabilities with structured job requirements, explains every score, identifies skill gaps, and supports candidate and employer workflows with persistent SQLite data.

The interface uses a warm editorial design system: nude and ivory foundations, coffee-brown actions, taupe supporting text, restrained terracotta emphasis, and espresso/chocolate dark-mode surfaces. Semantic CSS variables and Tailwind tokens keep the public, dashboard, and resume-intelligence experiences consistent.

All seeded people, companies, jobs, matches, and activity figures are fictional demonstration data. Match scores are heuristic guidance indicators—not hiring probabilities, eligibility decisions, or verified competence claims.

## What works

- Candidate, employer, and administrator roles with bcrypt password hashing and HTTP-only cookie sessions
- Public landing, job discovery/detail, methodology, about, and SDG impact pages
- Candidate skills CRUD, profile/preferences, ranked matches, explainability, skill gaps, roadmap tracking, and applications
- Employer dashboard and structured job creation
- Private PDF/DOCX/TXT resume upload with actual local text extraction
- Explainable ATS readiness, resume-to-job alignment, improvement decisions, and stored history
- Deterministic shared matching engine with alias normalization and non-applicable weight redistribution
- 65 normalized skills, 20 fictional jobs, 20 curated learning records, and three demo accounts
- Responsive light/dark UI, accessible labels/focus, loading/empty/error states, and reduced-motion support

## Architecture

The npm workspace contains `apps/web` (React + Vite + TypeScript), `apps/api` (Express + Prisma Client + SQLite), and `packages/shared` (Zod schemas and the reusable matching engine). The frontend proxies `/api` to port 4000. Prisma owns application queries; a small idempotent SQLite initializer is used because Prisma's schema engine currently fails under this machine's Node 24/Windows combination.

## Setup

Requirements: Node.js 20+ and npm 10+.

```bash
npm install
npm run build -w @skillbridge/shared
npm run db:setup
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:4000`.

Copy `.env.example` to `apps/api/.env` for custom configuration. Change `SESSION_SECRET` before any shared or production deployment.

## Demo accounts

All passwords are `Demo123!`.

| Role | Email |
|---|---|
| Candidate | `candidate@skillbridge.demo` |
| Employer | `employer@skillbridge.demo` |
| Administrator | `admin@skillbridge.demo` |

## Matching formula

- Required-skill coverage: 55%
- Preferred-skill coverage: 20%
- Proficiency alignment: 15%
- Declared work-preference alignment: 10%

Unavailable criteria are removed and their weights redistributed proportionally. Skill names are normalized before comparison, candidate duplicates retain the highest stated proficiency, and every result returns matched, missing, and partial skills plus criterion-level scores and contributions. Protected personal characteristics are never inputs.

## Useful commands

```bash
npm run dev          # web and API
npm run db:setup     # generate client, initialize SQLite, reseed
npm run db:seed      # reset and reseed demonstration data
npm test             # shared unit and API tests
npm run build        # production builds for all workspaces
```

## Demo flow

1. Sign in as the candidate and open **Job matches**.
2. Inspect the score breakdown for Junior Data Analyst.
3. Add Excel in **My skills**, return to matches, and observe the deterministic score change.
4. Open **Skill gaps**, then a job detail and submit an application.
5. Sign out, use the employer account, inspect the dashboard, and create a structured job posting.
6. Visit the public SDG page to see clearly labeled platform-activity indicators.

## Known limitations

- Education, experience, projects, saved jobs, learning-resource UI, status-update controls, and full admin moderation screens are represented in the data model or product plan but are not complete MVP interfaces.
- Roadmap completion is browser-session state; learning persistence is modeled but not yet wired to its screen.
- CSRF relies on `SameSite=Lax`; production should add explicit CSRF tokens, trusted proxy configuration, audit logging, email verification, and password reset.
- No external AI provider is invoked. Resume parsing and semantic embeddings remain planned enhancements.
- Frontend bundle code-splitting and full Playwright coverage remain follow-up work.
- OCR and visual layout analysis are not implemented; scanned PDFs require a text-based replacement.

## Production direction

Use PostgreSQL, a high-entropy session secret, HTTPS-only cookies, managed secrets, and a persistent Node host for the API. Deploy the Vite output to a static host and set its API URL/CORS origin. SQLite is intended only for local demos and should not be placed on ephemeral hosting.
