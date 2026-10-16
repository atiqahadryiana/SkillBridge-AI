# Database

## External opportunities

`JobSource` owns `ExternalJob` and `JobSyncLog`. `ExternalJobSkill` links unverified extracted requirements to the shared taxonomy. Candidate-owned `ExternalJobMatch`, `SavedExternalJob`, and `ExternalApplicationTracker` records are indexed and ownership-protected. Source/external-ID and candidate/job pairs are unique.

```mermaid
erDiagram
  USER ||--o| CANDIDATE : has
  USER ||--o| EMPLOYER : has
  CANDIDATE ||--o{ CANDIDATE_SKILL : records
  SKILL ||--o{ CANDIDATE_SKILL : classifies
  EMPLOYER ||--o{ JOB : posts
  JOB ||--o{ JOB_SKILL : requires
  CANDIDATE ||--o{ APPLICATION : submits
  JOB ||--o{ APPLICATION : receives
  CANDIDATE ||--o{ RESUME : owns
  RESUME ||--o{ RESUME_ANALYSIS : receives
  RESUME ||--o{ RESUME_JOB_MATCH : compares
  RESUME_ANALYSIS ||--o{ RESUME_SUGGESTION : generates
```

Emails, normalized skills, storage keys, and join pairs are unique. Resume JSON fields use serialized text for SQLite portability. Candidate/resume chronology is indexed. Cascade relationships remove analyses, matches, and suggestions when a resume is deleted; the service separately removes the private file. Ownership is always derived server-side.
