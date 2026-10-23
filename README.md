# SkillBridge AI

Smart Job Discovery now joins internal demonstration vacancies with an authorization-gated Jooble Malaysia connector. See [docs/JOB_AGGREGATOR.md](docs/JOB_AGGREGATOR.md) for setup, safeguards, provider status, and limitations.

SkillBridge AI is a working skills-based talent matching MVP for the Malaysian employment context. It compares candidate capabilities with structured job requirements, explains every score, identifies skill gaps, and supports candidate and employer workflows with persistent Supabase Postgres data.

The interface uses a technology editorial design system derived from the SkillBridgeAI logo: cool-white foundations, navy actions, restrained cyan emphasis, and midnight-blue dark-mode surfaces. Violet is limited to supporting brand details. Semantic CSS variables and Tailwind tokens keep the public, dashboard, and resume-intelligence experiences consistent.

The candidate overview uses a responsive three-column career feed: profile context and saved tools on the left, evidence-backed opportunity recommendations in the centre, and the next best skill or resume action on the right. On narrower screens, the supporting rails collapse below the main feed without hiding match limitations or demo labels.

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

The npm workspace contains `apps/web` (React + Vite + TypeScript), `apps/api` (Express + Prisma Client + Supabase Postgres), and `packages/shared` (Zod schemas and the reusable matching engine). The frontend proxies `/api` to port 4000. Prisma remains the only application persistence layer; Supabase supplies managed PostgreSQL rather than a second browser-side data client.

## Setup

Requirements: Node.js 20+, npm 10+, and a Supabase project.

Copy `.env.example` to `apps/api/.env`. In Supabase, open **Connect**, copy the transaction-pooler connection string to `DATABASE_URL`, and copy the direct/session-pooler connection string to `DIRECT_URL`. Replace the password placeholders, keep both values server-side, and set a new `SESSION_SECRET`.

```bash
npm install
npm run build -w @skillbridge/shared
npm run db:setup
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:4000`.

`db:setup` generates Prisma Client, applies the checked-in PostgreSQL migration, and loads visibly fictional demo data. Do not run the seed command against a production project that contains real data. API tests additionally require `TEST_DATABASE_URL` for a disposable PostgreSQL database.

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
npm run db:setup     # generate client, migrate Supabase Postgres, seed demo data
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

## Employer pre-screening

The sign-in screen starts with empty credentials. Choose **Candidate demo** or **Employer demo** to fill both fields, then select **Sign in**. Password visibility can be toggled without submitting the form.

Employers can configure company profiles and screening criteria, upload resumes or enter application evidence, review ranked candidates, record notes and overrides, progress hiring stages, export a shortlist, and delete candidate screening data. Outputs are advisory and exclude identity/protected fields. See [Employer screening](docs/EMPLOYER_SCREENING.md) for setup, scoring, privacy and API details. Run `npm run db:screening-demo` after the additive migration to add three fictional sample candidates.

## Production deployment

Use a high-entropy session secret, HTTPS-only cookies, and managed secrets in production. Configure `DATABASE_URL` with Supabase's transaction pooler and `DIRECT_URL` with its direct/session connection for migrations. Deploy the Vite output to a static host and set its API URL/CORS origin.

For the proposed single-project Vercel Services deployment, see [Vercel setup](docs/VERCEL.md). The root configuration routes browser requests to the API on the same domain. Private resume-storage migration is still required before production use.

### Firebase Hosting

The Vite frontend is linked to the Firebase project `skillbridge-adrynth` and deploys to `https://skillbridge-adrynth.web.app`. Run `npm run deploy:firebase` from the repository root. Firebase Hosting serves `apps/web/dist`, caches fingerprinted assets, and rewrites client-side routes to `index.html`. The Express API is not deployed by this command; it requires a separately configured runtime with PostgreSQL credentials and durable private resume storage.
