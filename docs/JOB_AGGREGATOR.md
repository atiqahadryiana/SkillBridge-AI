# Smart Job Discovery aggregator

## Architecture

Smart Job Discovery combines first-party `Job` records with normalized `ExternalJob` records. Provider code lives under `apps/api/src/integrations`: every live connector follows the shared provider contract, while authorization-gated sources use a placeholder that returns no jobs and contains no scraping logic.

Jooble Malaysia is the only live external adapter. It uses the official country-specific REST API with backend-only credentials, bounded pagination, an eight-second timeout, request coalescing, retries for temporary failures, a configurable cache, a conservative request budget, and automatic suspension on HTTP 429. Search remains functional with first-party demonstration jobs if Jooble is unavailable. A failed live search is reported; fake external results are never substituted.

## Provider status

| Source | Implementation | Authorization status |
| --- | --- | --- |
| SkillBridge AI employers | First-party database adapter | Authorized; seeded vacancies are labeled demo |
| Jooble Malaysia | Official REST API adapter | Enabled only with a Malaysia key and explicit flag |
| JobStreet Malaysia | Disabled placeholder | Integration Pending |
| Maukerja | Disabled placeholder | Integration Pending |
| GRADUAN | Disabled placeholder | Integration Pending |
| MYFutureJobs | Disabled placeholder | Integration Pending |
| Employer feeds | Disabled placeholder | Integration Pending until a feed contract exists |

No connector bypasses authentication, CAPTCHAs, robots, bot controls, or undocumented APIs.

## Configuration

```env
JOOBLE_API_KEY=
JOOBLE_API_ENABLED=false
JOOBLE_REQUEST_BUDGET=450
JOB_CACHE_TTL_MINUTES=60
```

Use a key issued through `https://my.jooble.org/api/about`. Credentials never enter the browser bundle.

## Normalization and attribution

External jobs retain the provider ID, source, original HTTPS application URL, company, location, snippet, optional salary text, employment type, provider update timestamp, cache freshness, and demo status. Missing values remain null. A snippet is never presented as a complete description.

Known skills are extracted locally from the existing taxonomy and stored as `UNVERIFIED`, confidence `0.55`, method `taxonomy-keyword`. A score requires at least two detected skills; otherwise the API asks for an authorized description. “Not found in the resume” never means “candidate lacks the skill.”

## Deduplication

The pipeline checks source plus external ID, canonical application URL, then exact normalized title/company/location. It deliberately does not merge merely similar openings.

## Caching, quotas, and retention

Identical in-flight searches are coalesced. Successful searches are cached for `JOB_CACHE_TTL_MINUTES`; pages are bounded to 1–10 and results to 1–20. HTTP 429 suspends the connector for the process lifetime. Stored rows carry freshness and listing status. Provider-specific retention must be reviewed against the signed agreement before production; no background scraping is scheduled.

## Security

- HTTPS-only external URLs; localhost and private IPv4 ranges are rejected.
- Provider credentials and outbound requests remain server-side.
- Candidate, resume, saved-job, tracker, and admin endpoints use role checks.
- Opening a source link does not claim an application occurred.
- Listing content is untrusted text, never executable instructions.
- Resumes are never sent to recruitment providers.

## Routes and limitations

Candidate pages: `/candidate/opportunities`, `/candidate/recommended-jobs`, `/candidate/saved-jobs`, and `/candidate/application-tracker`. Admin source status: `/admin/job-sources`.

Without credentials, local operation shows internal demo listings plus an explicit Jooble notice. Jooble snippets may omit structured requirements, work arrangement, industry, dates, expiry, or salary. Match confidence is limited and disclosed. External application status remains user-entered.

## Testing

Run `npm test` and `npm run build`. Tests mock the external API and do not require credentials. Coverage includes normalization, missing fields, unsafe URLs, duplicate detection, empty results, authentication and quota errors, access control, advisory matching, saving, and tracking.
