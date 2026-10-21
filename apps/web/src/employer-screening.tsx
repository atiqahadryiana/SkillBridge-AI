import { useState, type ReactNode } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { screeningKinds, screeningLabels, screeningEvidenceSchema, type ScreeningCriterion, type ScreeningEvidence, type ScreeningResult } from "@skillbridge/shared";
import "./employer-screening.css";

const base = "/api/employer/screening";
async function request<T = any>(path: string, method = "GET", data?: unknown): Promise<T> {
  const response = await fetch(base + path, { method, credentials: "include", headers: data instanceof FormData ? {} : { "Content-Type": "application/json" }, body: data === undefined ? undefined : data instanceof FormData ? data : JSON.stringify(data) });
  if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.details?.[0]?.message || error.error || "Request failed. Please retry."); }
  return response.status === 204 ? (undefined as T) : response.json();
}
const emptyEvidence = () => screeningEvidenceSchema.parse({});
const date = (value: string) => new Date(value).toLocaleString();
const statusNames: Record<string, string> = { REVIEW: "Review", PHONE_SCREEN: "Phone screen", INTERVIEW: "Interview", CLOSED: "Closed" };
type Candidate = { id: number; jobId: number; name: string; email: string; stage: string; override: string | null; status: string; isDemo: boolean; result: ScreeningResult; evidence: ScreeningEvidence; notes: string; overrideReason: string; history: { at: string; action: string }[]; updatedAt: string; jobTitle: string };
function ErrorMessage({ error }: { error: Error | null }) { return error ? <p className="error" role="alert">{error.message}</p> : null; }
function Load({ query, children }: { query: any; children: ReactNode }) {
  if (query.isPending) return <p role="status">Loading screening workspace…</p>;
  if (query.error) return <div><ErrorMessage error={query.error} /><button className="button secondary" onClick={() => query.refetch()}>Try again</button></div>;
  return <>{children}</>;
}
export function EmployerScreening() {
  return <section className="screening-workspace">
    <nav className="screening-nav" aria-label="Employer screening">
      <NavLink end to="/employer/screening">Screening jobs</NavLink>
      <NavLink to="/employer/screening/new">Create screening job</NavLink>
      <NavLink to="/employer/screening/company">Company profile</NavLink>
    </nav>
    <Routes>
      <Route index element={<Jobs />} />
      <Route path="new" element={<JobEditor />} />
      <Route path="company" element={<Company />} />
      <Route path="jobs/:jobId" element={<JobReview />} />
      <Route path="jobs/:jobId/edit" element={<JobEditor />} />
      <Route path="candidates/:candidateId" element={<CandidateReview />} />
      <Route path="*" element={<p>Screening page not found. <Link to="/employer/screening">Return to jobs</Link></p>} />
    </Routes>
  </section>;
}
function Jobs() {
  const query = useQuery<any[]>({ queryKey: ["screening-jobs"], queryFn: () => request("/jobs") });
  return <><header className="screening-heading"><div><h1>Employer pre-screening</h1><p>Find the evidence. Make the decision.</p></div><Link className="button" to="/employer/screening/new">Create screening job</Link></header>
    <p className="screening-notice">Scores guide review. Employers make every hiring decision. Name, age, gender, photo and nationality are excluded from scoring.</p>
    <Load query={query}><div className="screening-job-list">
      {!query.data?.length && <p>No jobs yet. Create a job and its screening checklist to begin.</p>}
      {query.data?.map((job) => <article key={job.id}><div><h2><Link to={`/employer/screening/jobs/${job.id}`}>{job.title}</Link></h2><p>{job.location} · {job._count.screeningCandidates} candidates</p></div><Link className="button secondary" to={`/employer/screening/jobs/${job.id}${job.screeningCriteria ? "" : "/edit"}`}>{job.screeningCriteria ? "Review candidates" : "Set screening criteria"}</Link></article>)}
    </div></Load></>;
}
function Company() {
  const query = useQuery({ queryKey: ["screening-company"], queryFn: () => request("/company") });
  return <><h1>Company profile</h1><p>Your employer account owns these jobs and candidate reviews.</p><Load query={query}>{query.data && <CompanyForm initial={query.data} />}</Load></>;
}
function CompanyForm({ initial }: { initial: any }) {
  const [form, setForm] = useState({ companyName: initial.companyName, industry: initial.industry, companySize: initial.companySize || "1–10", logoUrl: initial.logoUrl || "" });
  const client = useQueryClient();
  const save = useMutation({ mutationFn: () => request("/company", "PUT", form), onSuccess: () => client.invalidateQueries({ queryKey: ["screening-company"] }) });
  return <form className="screening-form panel" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
    {form.logoUrl.startsWith("https://") && <img className="company-logo" src={form.logoUrl} alt="Company logo preview" referrerPolicy="no-referrer" />}
    <label>Company name<input required maxLength={160} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></label>
    <label>Industry<input required maxLength={120} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></label>
    <label>Company size<select value={form.companySize} onChange={(e) => setForm({ ...form, companySize: e.target.value })}>{["1–10", "11–50", "51–200", "201–500", "501+"].map((v) => <option key={v}>{v}</option>)}</select></label>
    <label>Logo URL (HTTPS, optional)<input type="url" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} /></label>
    <ErrorMessage error={save.error} /><button className="button" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save company profile"}</button>{save.isSuccess && <p role="status">Company profile saved.</p>}
  </form>;
}
const defaults: ScreeningCriterion[] = screeningKinds.map((kind) => ({ kind, value: kind === "authorization" ? "required" : "", mode: ["degree", "certifications", "experience", "authorization", "location"].includes(kind) ? "KNOCKOUT" : "SCORED", weight: kind === "requiredSkills" ? 40 : 10 }));
function JobEditor() {
  const { jobId } = useParams();
  const query = useQuery({ queryKey: ["screening-job", jobId], queryFn: () => request(`/jobs/${jobId}`), enabled: !!jobId });
  return <><h1>{jobId ? "Edit job and criteria" : "Create a screening job"}</h1><p>Use job-related requirements only. Leave a criterion blank to exclude it.</p>{jobId ? <Load query={query}>{query.data && <JobForm key={jobId} initial={query.data} />}</Load> : <JobForm />}</>;
}
function JobForm({ initial }: { initial?: any }) {
  const [title, setTitle] = useState(initial?.title || ""), [description, setDescription] = useState(initial?.description || ""), [location, setLocation] = useState(initial?.location || "");
  const [criteria, setCriteria] = useState<ScreeningCriterion[]>(defaults.map((c) => initial?.criteria?.find((v: ScreeningCriterion) => v.kind === c.kind) || { ...c }));
  const client = useQueryClient(), navigate = useNavigate();
  const save = useMutation({ mutationFn: () => request(initial ? `/jobs/${initial.id}` : "/jobs", initial ? "PUT" : "POST", { title, description, location, criteria: criteria.filter((c) => c.value.trim()) }),
    onSuccess: async (job) => { await client.invalidateQueries({ queryKey: ["screening-jobs"] }); await client.invalidateQueries({ queryKey: ["screening-job"] }); await client.invalidateQueries({ queryKey: ["screening-candidates"] }); await client.invalidateQueries({ queryKey: ["screening-candidate"] }); navigate(`/employer/screening/jobs/${job.id}`); } });
  const update = (index: number, change: Partial<ScreeningCriterion>) => setCriteria(criteria.map((c,i) => i === index ? { ...c, ...change } : c));
  return <form className="screening-form" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
    {!initial && <p>New screening jobs are private workspaces, not public job-board listings.</p>}
    <div className="screening-fields"><label>Job title<input required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} /></label><label>Job location<input required maxLength={160} value={location} onChange={(e) => setLocation(e.target.value)} /></label></div>
    <label>Job description<textarea required minLength={20} maxLength={20000} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
    <h2>Screening checklist</h2><p>Knockout failures suggest Reject for human review. Missing evidence stays Partial. Scored weights are normalized to 100; unknown evidence earns no points. Degree, certification and skill terms use exact matches and supported skill aliases.</p>
    <div className="screening-criteria">{criteria.map((c,i) => <fieldset key={c.kind}><legend>{screeningLabels[c.kind]}</legend>
      <label>Requirement{c.kind === "authorization" ? <select value={c.value} onChange={(e) => update(i, { value: e.target.value })}><option value="">Not assessed</option><option value="required">Authorization required (not nationality)</option></select> : <input aria-label={`${screeningLabels[c.kind]} requirement`} value={c.value} placeholder={c.kind === "salary" ? "3000-5000" : ["experience", "notice"].includes(c.kind) ? "0" : "Comma-separated terms"} onChange={(e) => update(i, { value: e.target.value })} />}</label>
      <label>Behavior<select value={c.mode} onChange={(e) => update(i, { mode: e.target.value as ScreeningCriterion["mode"] })}><option value="KNOCKOUT">Knockout (advisory)</option><option value="SCORED">Scored</option></select></label>
      <label>Weight<input type="number" min={1} max={100} disabled={c.mode === "KNOCKOUT"} value={c.weight} onChange={(e) => update(i, { weight: Number(e.target.value) })} /></label>
    </fieldset>)}</div>
    {initial && <p>Saving criteria recalculates all candidate suggestions. Employer overrides remain in place; review them after changes.</p>}
    <ErrorMessage error={save.error} /><button className="button" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save job and criteria"}</button>
  </form>;
}
function EvidenceFields({ value, change }: { value: ScreeningEvidence; change: (v: ScreeningEvidence) => void }) {
  return <div className="screening-fields">
    {([ ["degrees", "Degrees (comma-separated)"], ["certifications", "Certifications (comma-separated)"], ["skills", "Skills (comma-separated)"] ] as const).map(([key,label]) => <label key={key}>{label}<input value={value[key].join(",")} onChange={(e) => change({ ...value, [key]: e.target.value.split(",") })} /></label>)}
    <label>Location<input value={value.location} onChange={(e) => change({ ...value, location: e.target.value })} /></label>
    <label>Work authorization<select value={value.authorized === null ? "" : String(value.authorized)} onChange={(e) => change({ ...value, authorized: e.target.value === "" ? null : e.target.value === "true" })}><option value="">Unknown / not supplied</option><option value="true">Yes, reported</option><option value="false">No, reported</option></select></label>
    {([ ["experienceYears", "Relevant experience (years)", 100], ["salaryExpectation", "Expected monthly salary (MYR)", 1000000], ["noticeDays", "Notice period (days)", 1000] ] as const).map(([key,label,max]) => <label key={key}>{label}<input type="number" min={0} max={max} step={key === "experienceYears" ? "0.1" : "1"} placeholder="Unknown" value={value[key] ?? ""} onChange={(e) => change({ ...value, [key]: e.target.value === "" ? null : Number(e.target.value) })} /></label>)}
  </div>;
}
const cleanEvidence = (v: ScreeningEvidence) => ({ ...v, degrees: v.degrees.map((s) => s.trim()).filter(Boolean), certifications: v.certifications.map((s) => s.trim()).filter(Boolean), skills: v.skills.map((s) => s.trim()).filter(Boolean) });
function AddCandidate({ jobId }: { jobId: string }) {
  const [name,setName] = useState(""), [email,setEmail] = useState(""), [evidence,setEvidence] = useState(emptyEvidence), [consent,setConsent] = useState(false);
  const client = useQueryClient(), navigate = useNavigate();
  const parse = useMutation({ mutationFn: (file: File) => { const form = new FormData(); form.append("resume",file); return request("/parse-resume", "POST",form); }, onSuccess: (data) => setEvidence(data.evidence) });
  const save = useMutation({ mutationFn: () => request(`/jobs/${jobId}/candidates`, "POST", { name,email,evidence: cleanEvidence(evidence),consent }), onSuccess: async (row) => { await client.invalidateQueries({ queryKey: ["screening-candidates"] }); await client.invalidateQueries({ queryKey: ["screening-jobs"] }); navigate(`/employer/screening/candidates/${row.id}`); } });
  return <details className="screening-add"><summary>Add candidate or upload resume</summary><form className="screening-form" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
    <p>Upload a text-based PDF, DOCX or TXT (maximum 4 MB), or enter application evidence below. The file is parsed locally and discarded. Review suggested fields before saving; only these fields are scored.</p>
    <label className="screening-consent"><input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />I have permission to process this candidate’s application.</label>
    <label>Resume file<input type="file" accept=".pdf,.docx,.txt" disabled={!consent || parse.isPending} onChange={(e) => { const file = e.target.files?.[0]; if (file) parse.mutate(file); }} /></label>
    {parse.isPending && <p role="status">Reading resume…</p>}{parse.isSuccess && <p role="status">{parse.data.message}</p>}<ErrorMessage error={parse.error} />
    <div className="screening-fields"><label>Candidate name (not scored)<input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></label><label>Email (optional, not scored)<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label></div>
    <EvidenceFields value={evidence} change={setEvidence} /><ErrorMessage error={save.error} /><button className="button" disabled={save.isPending || parse.isPending}>{save.isPending ? "Saving…" : "Save and screen candidate"}</button>
  </form></details>;
}
function JobReview() {
  const { jobId = "" } = useParams();
  const job = useQuery({ queryKey: ["screening-job",jobId], queryFn: () => request(`/jobs/${jobId}`) });
  const candidates = useQuery<Candidate[]>({ queryKey: ["screening-candidates",jobId], queryFn: () => request(`/jobs/${jobId}/candidates`) });
  const [filter,setFilter] = useState(""), [sort,setSort] = useState("score"), [stage,setStage] = useState(""), [search,setSearch] = useState("");
  const visible = (candidates.data || []).filter((c) => (!filter || c.status === filter) && (!stage || c.stage === stage) && c.name.toLowerCase().includes(search.toLowerCase())).sort((a,b) => sort === "score" ? (b.result.score ?? -1)-(a.result.score ?? -1) : sort === "status" ? a.status.localeCompare(b.status) : a.name.localeCompare(b.name));
  return <Load query={job}><header className="screening-heading"><div><Link to="/employer/screening">← All screening jobs</Link><h1>{job.data?.title}</h1><p>{job.data?.location}</p></div><Link className="button secondary" to={`/employer/screening/jobs/${jobId}/edit`}>Edit criteria</Link></header>
    <p className="screening-notice">Shortlist, Maybe and Reject are suggestions. Missing evidence requires follow-up. No automated rejections or candidate messages are sent.</p>
    {job.data?.screeningCriteria ? <><AddCandidate jobId={jobId} /><div className="screening-toolbar">
      <label>Find candidate<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
      <label>Result<select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All results</option>{["Shortlist","Maybe","Reject"].map((v) => <option key={v}>{v}</option>)}</select></label>
      <label>Stage<select value={stage} onChange={(e) => setStage(e.target.value)}><option value="">All stages</option>{Object.entries(statusNames).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Sort<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="score">Highest score</option><option value="status">Result</option><option value="name">Name</option></select></label>
      <a className="button secondary" href={`${base}/jobs/${jobId}/shortlist.csv`}>Export full shortlist CSV</a>
    </div><Load query={candidates}><p role="status">{visible.length} of {candidates.data?.length || 0} candidates · Ranked by {sort === "score" ? "documented fit" : sort}</p><div className="screening-table-wrap" tabIndex={0} aria-label="Candidate table, scroll horizontally on small screens"><table className="screening-table"><thead><tr><th scope="col">Candidate</th><th scope="col">Score</th><th scope="col">Result</th><th scope="col">Stage</th><th scope="col">Review</th></tr></thead><tbody>{visible.map((c) => <tr key={c.id}><td>{c.name}{c.isDemo && <small>Fictional demo</small>}</td><td>{c.result.score === null ? "Not scored" : `${c.result.score}/100`}</td><td>{c.status}<small>{c.override ? "Employer decision" : "Advisory suggestion"}</small></td><td>{statusNames[c.stage]}</td><td><Link to={`/employer/screening/candidates/${c.id}`}>Review evidence</Link></td></tr>)}</tbody></table></div>{!visible.length && <p>No candidates match this view. Add a candidate or clear your filters.</p>}</Load></> : <p>Set screening criteria before adding candidates.</p>}
  </Load>;
}
function CandidateReview() {
  const { candidateId } = useParams();
  const query = useQuery<Candidate>({ queryKey: ["screening-candidate",candidateId], queryFn: () => request(`/candidates/${candidateId}`) });
  return <Load query={query}>{query.data && <CandidateDetail key={`${candidateId}-${query.data.updatedAt}`} row={query.data} />}</Load>;
}
function CandidateDetail({ row }: { row: Candidate }) {
  const [notes,setNotes] = useState(row.notes), [override,setOverride] = useState(row.override || ""), [reason,setReason] = useState(row.overrideReason), [stage,setStage] = useState(row.stage), [evidence,setEvidence] = useState(row.evidence), [confirm,setConfirm] = useState(false);
  const client = useQueryClient(), navigate = useNavigate();
  const save = useMutation({ mutationFn: (data: unknown) => request(`/candidates/${row.id}`, "PATCH", data), onSuccess: async () => { await client.invalidateQueries({ queryKey: ["screening-candidates"] }); await client.invalidateQueries({ queryKey: ["screening-candidate"] }); } });
  const remove = useMutation({ mutationFn: () => request(`/candidates/${row.id}`, "DELETE"), onSuccess: async () => { client.removeQueries({ queryKey: ["screening-candidate",String(row.id)] }); await client.invalidateQueries({ queryKey: ["screening-candidates"] }); await client.invalidateQueries({ queryKey: ["screening-jobs"] }); navigate(`/employer/screening/jobs/${row.jobId}`); } });
  return <><Link to={`/employer/screening/jobs/${row.jobId}`}>← Back to candidates</Link><header className="screening-heading"><div><h1>{row.name}</h1><p>{row.jobTitle} · {row.email || "Email not supplied"}{row.isDemo ? " · Fictional demo" : ""}</p></div><div className="screening-score"><strong>{row.result.score === null ? "—" : row.result.score}</strong><span>documented fit / 100</span></div></header>
    <p className="screening-notice">Suggested: <b>{row.result.recommendation}</b> · Current: <b>{row.status}</b> · {row.result.needsReview ? "Evidence needs follow-up." : "Review all evidence before deciding."} {row.result.knockoutFailed ? "A reported answer fails a knockout criterion." : ""}</p>
    <div className="screening-detail-grid"><section><h2>Evidence checklist</h2>{row.result.checklist.map((c) => <article className="screening-check" key={c.kind}><div><h3>{c.label}</h3><strong className={`screening-state ${c.status.toLowerCase()}`}>{c.status}</strong></div><p>Required: {c.value} · {c.mode === "KNOCKOUT" ? "Knockout (advisory)" : `Weight ${c.weight}; ${Math.round(c.fraction * 100)}% met`}</p><p>{c.explanation}</p></article>)}<p className="fine">{row.result.algorithmVersion} · Structured evidence only. Scores are guidance, not hiring probabilities.</p></section>
    <form className="screening-form panel" onSubmit={(e) => { e.preventDefault(); save.mutate({ notes,override: override || null,overrideReason: reason,stage }); }}><h2>Employer review</h2><label>Decision<select value={override} onChange={(e) => setOverride(e.target.value)}><option value="">Use advisory suggestion</option>{["Shortlist","Maybe","Reject"].map((v) => <option key={v}>{v}</option>)}</select></label><label>Reason for employer decision<textarea required={!!override} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} /></label><label>Hiring stage<select value={stage} onChange={(e) => setStage(e.target.value)}>{Object.entries(statusNames).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Private notes<textarea rows={5} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} /></label><ErrorMessage error={save.error} /><button className="button" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save employer review"}</button></form></div>
    <details className="screening-add"><summary>Review or correct candidate evidence</summary><form className="screening-form" onSubmit={(e) => { e.preventDefault(); save.mutate({ evidence: cleanEvidence(evidence) }); }}><p>Record only job-related facts supplied by the candidate. Leave unverified practical details unknown.</p><EvidenceFields value={evidence} change={setEvidence} /><ErrorMessage error={save.error} /><button className="button secondary" disabled={save.isPending}>Save evidence and recalculate</button></form></details>
    <details className="screening-add"><summary>Review activity</summary>{row.history.length ? <ul>{row.history.map((entry,i) => <li key={i}>{date(entry.at)} · {entry.action}</li>)}</ul> : <p>No employer changes yet.</p>}</details>
    <section className="screening-delete"><h2>Delete candidate data</h2><p>Removes this screening record, evidence, notes and review history permanently. Other applications and exported CSV files are not affected.</p><label className="screening-consent"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />I confirm deletion of this candidate’s screening data.</label><button className="button secondary" disabled={!confirm || remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? "Deleting…" : "Delete candidate data"}</button><ErrorMessage error={remove.error} /></section>
  </>;
}
