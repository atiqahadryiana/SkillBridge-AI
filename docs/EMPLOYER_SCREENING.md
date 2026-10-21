# Employer pre-screening

## Try it

With existing demo accounts, run `npm run db:migrate`, `npx prisma generate --schema apps/api/prisma/schema.prisma`, `npm run db:screening-demo`, then `npm run dev`. Stop the API first if Windows holds Prisma's DLL open. For a fresh local setup, use `npm install` and `npm run db:setup` before these commands. Base `db:setup` resets demo records; the new `db:screening-demo` is additive and leaves an existing screening demo untouched.

Sign in with `employer@skillbridge.demo` / `Demo123!`. Open **Pre-screening** in the employer sidebar or `/employer/screening`. The unpublished fictional Junior Data Analyst job contains three candidates covering advisory Shortlist, Maybe and Reject. New employers can register with the Employer account type and are routed to company setup (name, industry, size, HTTPS logo URL).

## Workflow

New screening jobs are private workspaces (`published: false`). Existing posted jobs also appear here and can receive a screening checklist. Upload or enter candidate evidence explicitly; existing applications are not automatically imported.

Create a job with a title, description, location and checklist. Degree, certifications, skills and accepted locations are comma-separated requirements. Required terms are exact matches after whitespace/case normalization; supported skill aliases such as JS/JavaScript also match. All listed degree/certification terms are required, not alternatives. Salary uses monthly MYR `minimum-maximum`; experience is years; notice is days. Blank requirements are excluded. Each item can be knockout or weighted; knockout weights are not used.

Upload PDF, DOCX or TXT (4 MB maximum), or enter candidate application facts manually. Confirm permission before uploading. Parsing extracts suggestions only from explicitly labeled professional sections. Review them before saving. Names and emails are entered separately and never sent to the scoring function. Work authorization, experience, location, salary and notice are explicit structured answers; they are not inferred from identity or nationality. This is document evidence, not verification of qualifications.

The job page ranks by score, filters by current result/stage/name and sorts by score/result/name. The review page shows checklist explanations, criteria, weights and evidence gaps. Employers may correct evidence, record private notes, override the suggestion with a reason, and move the candidate to phone screen, interview or closed. No automatic rejection email or application status change is sent. CSV exports the complete current shortlist, irrespective of table filters; employer overrides take precedence. Cells are quoted and spreadsheet formulas neutralized.

## Deterministic scoring

Implementation: `packages/shared/src/index.ts`, algorithm `employer-screen-v1`.

- Scored result = 100 × sum(weight × documented fraction) / sum(scored weights), rounded to an integer.
- Exact documented list terms earn proportional credit. Missing list terms are Partial and require review, never proof that the person lacks a qualification.
- Explicit numerical, location or authorization answers meeting a requirement pass; conflicting answers fail. Missing values are Partial and earn no points. Zero is an explicit answer.
- A known knockout failure suggests Reject. Otherwise any unknown evidence suggests Maybe. With complete evidence, scores at least 75 suggest Shortlist, at least 45 suggest Maybe, and lower scores suggest Reject.
- Knockout-only lists show no numerical score; passing all suggests Shortlist. All outputs are advisory. The suggested label is separate from employer decisions and workflow stage.
- Salary expectation below the advertised minimum passes the budget check but produces a warning to confirm a fair offer. It is not rewarded with extra points.
- Criteria changes recalculate suggestions on every read; saved overrides remain. Review them after changing criteria. Activity records track employer evidence/decision/stage edits, not immutable historical scoring snapshots.
- Scoring accepts only a fixed structured evidence schema. Identity/protected fields are stripped. A protected-term guard rejects common demographic criteria; it is not a substitute for an employer's review of job relevance.

## Data and privacy

Employer adds `companySize` and `logoUrl`. Job adds `screeningCriteria` (validated JSON). `ScreeningCandidate` belongs to Job with cascade deletion and stores encrypted payload, separate employer override, stage, demo flag and timestamps. Additive SQLite migration is in `prisma/init.ts` alongside the Prisma schema.

Payloads use AES-256-GCM with random IVs and authenticated ciphertext. Set a stable `SCREENING_ENCRYPTION_KEY` of at least 32 random characters, or a sufficiently long `SESSION_SECRET` fallback. Keep secrets outside source control. Rotating the key without re-encrypting records makes them unreadable. Existing candidate-profile data elsewhere in the app is unaffected by this encryption scope.

All screening routes require EMPLOYER authentication, enforce job ownership, validate writes, and emit `Cache-Control: no-store`. Parsed resume bytes and full text are not retained or sent to external AI. Only reviewed structured evidence, identity, notes and activity are encrypted and stored. The explicit deletion action permanently removes that screening record and its embedded activity/notes. Other applications, backups and downloaded CSV copies require their own retention/deletion process. HTTPS and secure key management are required for production; local SQLite still needs migration for Vercel persistence as described in VERCEL.md.

## API

All endpoints below are under `/api/employer/screening`:

- GET/PUT `/company`
- GET/POST `/jobs`
- GET/PUT `/jobs/:jobId`
- GET/POST `/jobs/:jobId/candidates`
- GET `/jobs/:jobId/shortlist.csv`
- GET/PATCH/DELETE `/candidates/:candidateId`
- POST `/parse-resume` (multipart field `resume`)

Tests cover weights, missing versus failing evidence, protected-field exclusion, encryption, role/ownership boundaries, upload limits, CSV safety, human overrides and deletion. Run `npm test` and `npm run build`.

## Verification and production follow-up

The implementation was verified with 41 passing automated tests, a production build, and a desktop/390px mobile browser smoke check covering the seeded job, result filtering and evidence detail. Existing fonts and warm semantic tokens are preserved. The shared PDF extraction helper uses `pdf-parse` 2.4.5 and releases parser resources in `finally`; real PDF/DOCX upload regression tests pass. API runtime needs a supported modern Node version (this workspace uses Node 24).

Do not treat this local implementation as production security sign-off. `npm audit --omit=dev` reports six dependency findings (three high, three moderate) in the existing Prisma/Mammoth dependency chains; remediation needs compatibility review. Before handling real candidate data, resolve dependency findings, configure HTTPS and stable encryption secrets, review lawful processing/retention, and migrate local SQLite to durable production storage. No deployment or Git push is included in this feature update.
