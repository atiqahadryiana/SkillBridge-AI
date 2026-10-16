# API summary

Smart Job Discovery: `GET /api/opportunities`, `GET /api/opportunities/recommended`, `GET /api/opportunities/:id`, `POST /api/opportunities/:id/match`, `POST /api/opportunities/:id/resume-check`, `GET /api/opportunities/saved`, and `POST|DELETE /api/opportunities/:id/save`.

External tracking: `GET|POST /api/external-applications` and `PATCH /api/external-applications/:id`. Admin governance: `GET|PATCH /api/admin/job-sources`, `POST /api/admin/job-sources/:id/sync`, and `GET /api/admin/job-sync-logs`.

Authentication: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

Public: `GET /api/jobs`, `GET /api/jobs/:id`, `GET /api/impact`.

Candidate-only: `GET/PATCH /api/candidate/profile`, `POST/DELETE /api/candidate/skills`, `GET /api/candidate/matches`, `GET /api/candidate/applications`, `POST /api/jobs/:id/apply`.

Employer-only: `POST /api/employer/jobs`, `GET /api/employer/dashboard`.

Candidate resume APIs: `POST /api/resume/upload`, `GET /api/resume`, `GET/DELETE /api/resume/:id`, analyze/analysis, job-match/job-matches, suggestions, history, and explicit skill import under `/api/resume`.

JSON errors use `{ "error": "message" }`; validation errors also include Zod issue details. Authentication failures return 401, authorization failures 403, duplicates 409, and unknown jobs 404.
