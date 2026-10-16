# SkillBridge AI Resume Intelligence

## Objective

Resume Intelligence connects private document upload, local text extraction, explainable ATS readiness, job-specific evidence matching, profile skill review, improvement guidance, history, and applications. It estimates how clearly a resume communicates information; it does not reproduce a commercial ATS or predict hiring.

## Formats and upload security

Text-based PDF, DOCX, and optional TXT files are supported up to 5 MB by default (`MAX_RESUME_SIZE_BYTES`). The API validates file signatures, limits multipart size and file count, parses in memory, generates a random storage key, strips the client path, and stores originals outside the public web directory with private permissions. There is no public download route. Every operation derives the candidate from the signed HTTP-only session and applies ownership conditions. Deletion cascades stored results and unlinks the private file.

Scanned PDFs are not OCRed. Documents with fewer than 20 extracted words return the explicit low-text error. Malformed parsers fail safely without exposing stack traces.

## Parsing process

PDF extraction uses `pdf-parse`; DOCX extraction uses Mammoth. Cleaned text is split using flexible heading variants for contact, summary, skills, education, experience, projects, and certifications. Skill extraction reuses the normalized taxonomy and aliases. Skills remain unverified until explicitly selected; profile import uses Beginner proficiency and never overwrites an existing rating.

## ATS readiness

| Criterion | Weight |
|---|---:|
| Text extraction and parseability | 30% |
| Section structure | 25% |
| Contact and professional information | 15% |
| Skills and evidence | 20% |
| Clarity and consistency | 10% |

The score is the sum of `criterion score × weight`. Rules inspect word volume, headings, parseable contact information, taxonomy skills, project/experience evidence, bullets, repeated lines, and limited date consistency. The engine does not claim reliable visual column, font, or image detection.

Example: criterion scores of 80, 75, 67, 70, and 90 yield `24 + 18.75 + 10.05 + 14 + 9 = 75.8`, rounded to 76.

## Job alignment

| Criterion | Base weight |
|---|---:|
| Required skills | 40% |
| Preferred skills | 15% |
| Experience/project evidence | 20% |
| Responsibilities relevance | 15% |
| Education/certification | 10% when specified |

Non-applicable criteria are removed and weights redistributed. Structured jobs supply required and preferred skills. Pasted descriptions use taxonomy recognition. Evidence requires a skill to occur in experience or projects; a list-only skill is marked unclear. Missing terminology is a documentation signal, not proof of missing competence.

## APIs

- `POST /api/resume/upload`
- `GET /api/resume`, `GET /api/resume/:id`, `DELETE /api/resume/:id`
- `POST /api/resume/:id/analyze`, `GET /api/resume/:id/analysis`
- `POST /api/resume/:id/job-match`, `GET /api/resume/:id/job-matches`
- `GET /api/resume/:id/suggestions`, `PATCH /api/resume/suggestions/:id`
- `GET /api/resume/history`
- `POST /api/resume/:id/import-skills`

## AI, privacy, and limitations

Version 1 is fully local and rule-based. No resume content is sent to an external model. A future provider must require explicit consent, minimize transmitted content, treat it as untrusted, and preserve a local fallback.

Tests generate genuine PDF and DOCX fixtures and cover validation, size limits, corrupt/low-text files, heading/alias recognition, score bounds, redistribution, gaps, permissions, history, and deletion. Complex layouts may lose reading order. OCR, semantic embeddings, and generative rewriting are not implemented.
