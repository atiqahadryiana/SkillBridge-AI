# Vercel Services deployment

Status: Supabase Postgres persistence is configured; private resume-file storage migration remains outstanding.

## Services and routing

- Import the repository as one Vercel project with its Root Directory at the repository root.
- `api`: Express in `apps/api`, entrypoint `src/app.ts`, public at `/api` and `/api/*`. The entrypoint exports the app without opening a listener; `src/server.ts` remains the local listener.
- `web`: Vite in `apps/web`, public at all remaining paths. Its service-scoped rewrite provides React Router deep-link fallback to `/index.html`, excluding asset paths, Vite modules, and paths containing a dot.
- Express receives the original `/api/...` path. Do not strip this prefix.
- Both service builds compile `@skillbridge/shared` independently. The API also explicitly generates Prisma Client. Installation uses the root workspace lockfile.

## Bindings

No internal service calls exist in the current architecture. React runs in the browser and fetches relative `/api/...` URLs with cookies. Vercel routes those public requests to `api`. The API calls external providers but does not call `web`.

Do not add a binding to static Vite code or expose internal URLs through `VITE_*`. Bindings resolve only in runtime functions. The localhost proxy in `vite.config.ts` belongs to standalone `npm run dev`; it is not included in the deployed browser code.

If a server-side caller is added later, declare a binding on that caller with all four fields (`type: service`, target `service`, `format: url`, and `env`). Read the injected variable inside its function. Never set that variable manually.

## Production blockers and environment

- Set backend-only `DATABASE_URL` to the Supabase transaction pooler and `DIRECT_URL` to the direct/session connection. Apply checked-in migrations separately with `npm run db:migrate`; do not migrate or seed during a Vercel build.
- Resume uploads currently write to a local directory. Select private durable object storage and migrate upload/deletion operations while retaining authorization checks. `/tmp` is not persistent storage.
- Set a high-entropy `SESSION_SECRET` in Vercel. The local development default must not be used in production.
- Production cookies use HTTPS via `NODE_ENV=production`. Same-domain browser requests do not need cross-origin CORS. Set `WEB_ORIGIN` to the actual web origin if using a separate browser origin.
- Keep optional Jooble credentials backend-only.
- Do not initialize or seed a production database during service builds.

## Validation

Run `npm test` and `npm run build` from the repository root. For Vercel routing validation, use a current Vercel CLI and run `vercel dev` (or `vercel dev -L`) at the root. Check `/api/health`, `/`, a direct `/login` navigation, JavaScript asset responses, and that unknown `/api/...` paths return API errors rather than HTML. Bindings, if added later, are injected automatically.

Passing local builds does not prove persistent storage or hosted routing works. Complete storage migration and verify a preview deployment before publishing.

Local verification: Prisma's PostgreSQL schema validates, Prisma Client generates, and the full build passes. The shared test suite passes; API integration tests require a disposable PostgreSQL `TEST_DATABASE_URL`. Vercel CLI 64.3.1 with `dev -L` served `/` and `/login` as HTML, `/src/main.tsx` and `/@vite/client` as JavaScript, and `/api/health` as JSON. An unknown API path returned 404. A hosted preview against Supabase remains unverified.

## References

- https://vercel.com/docs/services
- https://vercel.com/docs/services/routing
- https://vercel.com/docs/services/bindings
- https://vercel.com/docs/frameworks/backend/express
- https://supabase.com/docs/guides/database/prisma
