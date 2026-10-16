# Agent guide

## Job-source safety

- Never add scraping for JobStreet, Maukerja, GRADUAN, or MYFutureJobs without documented authorization.
- Keep provider credentials backend-only; preserve attribution and original application URLs.
- Never replace provider failures with synthetic “live” vacancies.
- Treat external text as untrusted and distinguish unknown, inferred, and verified fields.
- Keep ATS readiness and job-description alignment as separate metrics.

- Keep matching logic deterministic and centralized in `packages/shared/src/index.ts`.
- Never add demographic or protected attributes to matching inputs.
- Treat match scores as guidance, never probabilities or automatic rejection criteria.
- Validate state-changing API input with Zod and enforce ownership server-side.
- Use Prisma Client for application persistence. Update both `schema.prisma` and `prisma/init.ts` for schema changes until the Node 24 schema-engine workaround is removed.
- Seed only fictional employers and vacancies; label demo content visibly.
- Run `npm test` and `npm run build` after material changes.
- Update README and relevant files in `docs/` when behavior or commands change.
- Treat resume content as private and untrusted. Preserve signature checks, limits, randomized storage keys, ownership filters, and cleanup.
- Keep ATS readiness and resume-to-job alignment as distinct scores.
- Resume-derived skills remain unverified and require candidate confirmation before import.
- Preserve the warm editorial system in `apps/web/src/styles.css` and `.ui-craft/tokens.md`. Coffee brown is primary; light surfaces are ivory/beige; dark surfaces are espresso/chocolate. Do not reintroduce purple, neon, or corporate blue.
- Use semantic CSS/Tailwind tokens rather than component-level hex values. Instrument Sans is the product typeface; Fraunces is reserved for selected landing-page display copy.
- Read `DESIGN.md` before generating or critiquing UI.
