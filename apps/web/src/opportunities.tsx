import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BriefcaseBusiness, Check, ChevronRight, ExternalLink, FileSearch, MapPin, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", headers: { "Content-Type": "application/json", ...options?.headers }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

type Opportunity = {
  id: string; numericId: number; kind: "INTERNAL" | "EXTERNAL"; title: string;
  company: string; location: string; workArrangement?: string; employmentType?: string;
  industry?: string; salaryText?: string; descriptionSnippet: string; externalUrl?: string;
  source: string; sourceType: string; sourceStatus: string; isDemo: boolean;
  requiredSkills: string[]; preferredSkills?: string[]; skillsVerified: boolean; isSaved?: boolean;
};
type SearchResult = { jobs: Opportunity[]; total: number; notices: string[]; sources: { id: string; name: string; enabled: boolean }[]; plannedSources: { id: string; name: string; message: string }[] };

export function OpportunitiesPage({ recommended = false }: { recommended?: boolean }) {
  const [filters, setFilters] = useState({ keyword: "", location: "", source: "", employmentType: "", minSalary: "" });
  const [applied, setApplied] = useState(filters);
  const [selected, setSelected] = useState<Opportunity>();
  const query = new URLSearchParams(Object.entries(applied).filter(([, value]) => value)).toString();
  const { data, isLoading, error } = useQuery<SearchResult | any[]>({ queryKey: ["opportunities", recommended, applied], queryFn: () => api(recommended ? "/api/opportunities/recommended" : `/api/opportunities?${query}`) });
  const jobs: Opportunity[] = recommended ? ((data as any[]) || []).map((x) => ({ ...x.job, recommendation: x })) : (data as SearchResult)?.jobs || [];
  return (
    <div className="opportunity-page">
      <header className="opportunity-heading">
        <div><p className="eyebrow">Smart job discovery</p><h1>{recommended ? "Recommended opportunities, explained." : "Discover Opportunities That Match Your Potential."}</h1><p>Explore career opportunities from multiple job sources, powered by intelligent skills matching and resume insights.</p></div>
        <span className="source-proof"><i /> Authorized sources only</span>
      </header>
      {!recommended && <form className="opportunity-search" onSubmit={(e) => { e.preventDefault(); setApplied(filters); }}>
        <label><Search size={16} /><input aria-label="Job title or keywords" placeholder="Job title or keywords" value={filters.keyword} onChange={(e) => setFilters({ ...filters, keyword: e.target.value })} /></label>
        <label><MapPin size={16} /><select aria-label="Location" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })}><option value="">All Malaysia</option>{["Kuala Lumpur", "Selangor", "Johor", "Penang", "Melaka", "Perak", "Sabah", "Sarawak", "Negeri Sembilan"].map((x) => <option key={x}>{x}</option>)}</select></label>
        <details><summary><SlidersHorizontal size={16} /> More filters</summary><div>
          <label>Source<select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}><option value="">All enabled sources</option><option value="internal">SkillBridge AI</option>{(data as SearchResult)?.sources?.filter((x) => x.enabled && x.id !== "internal").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label>Employment type<select value={filters.employmentType} onChange={(e) => setFilters({ ...filters, employmentType: e.target.value })}><option value="">Any type</option><option>Full-time</option><option>Part-time</option><option>Internship</option><option>Graduate programme</option></select></label>
          <label>Minimum salary<input type="number" min="0" placeholder="MYR" value={filters.minSalary} onChange={(e) => setFilters({ ...filters, minSalary: e.target.value })} /></label>
        </div></details>
        <button className="button">Search opportunities</button>
      </form>}
      {!recommended && <div className="quick-filters" aria-label="Quick job filters">
        <button className={!applied.source && !applied.employmentType ? "active" : ""} onClick={() => { const next = { ...filters, source: "", employmentType: "" }; setFilters(next); setApplied(next); }}>All jobs</button>
        <button className={applied.source === "internal" ? "active" : ""} onClick={() => { const next = { ...filters, source: "internal" }; setFilters(next); setApplied(next); }}>SkillBridge postings</button>
        {(data as SearchResult)?.sources?.some((x) => x.id === "jooble" && x.enabled) && <button className={applied.source === "jooble" ? "active" : ""} onClick={() => { const next = { ...filters, source: "jooble" }; setFilters(next); setApplied(next); }}>Jooble</button>}
        <button className={applied.employmentType === "Full-time" ? "active" : ""} onClick={() => { const next = { ...filters, employmentType: applied.employmentType === "Full-time" ? "" : "Full-time" }; setFilters(next); setApplied(next); }}>Full-time</button>
        <button className={applied.employmentType === "Internship" ? "active" : ""} onClick={() => { const next = { ...filters, employmentType: applied.employmentType === "Internship" ? "" : "Internship" }; setFilters(next); setApplied(next); }}>Internships</button>
      </div>}
      {!recommended && (data as SearchResult)?.notices?.map((notice) => <p className="provider-notice" key={notice}>{notice}</p>)}
      {error && <p className="error">{(error as Error).message}</p>}
      <div className="opportunity-layout">
        <aside className="source-rail">
          <strong>Sources</strong><p>Enabled integrations appear in search.</p>
          {(data as SearchResult)?.sources?.map((source) => <span key={source.id}><i className={source.enabled ? "online" : ""} />{source.name}<small>{source.enabled ? "Available" : "Unavailable"}</small></span>)}
          <strong>Planned integrations</strong>{(data as SearchResult)?.plannedSources?.map((source) => <span key={source.id}>{source.name}<small>Integration pending</small></span>)}
        </aside>
        <main className="opportunity-list" aria-busy={isLoading}>
          <div className="result-line"><span>{isLoading ? "Searching authorized sources…" : `${jobs.length} opportunities shown`}</span><small>Latest available listings</small></div>
          {jobs.map((job: any) => <OpportunityCard key={job.id} job={job} selected={selected?.id === job.id} onSelect={() => setSelected(job)} recommendation={job.recommendation} />)}
          {!isLoading && !jobs.length && <div className="empty"><BriefcaseBusiness /><h3>No matching opportunities</h3><p>Try a broader keyword or location. Live providers are never replaced with fabricated results.</p></div>}
        </main>
        <OpportunityPreview job={selected || jobs[0]} />
      </div>
    </div>
  );
}

function OpportunityCard({ job, selected, onSelect, recommendation }: { job: Opportunity; selected: boolean; onSelect: () => void; recommendation?: any }) {
  const client = useQueryClient();
  const save = useMutation({ mutationFn: () => api(`/api/opportunities/${job.numericId}/save`, { method: job.isSaved ? "DELETE" : "POST", body: job.isSaved ? undefined : "{}" }), onSuccess: () => client.invalidateQueries({ queryKey: ["opportunities"] }) });
  return <article className={`opportunity-card ${selected ? "selected" : ""}`} onClick={onSelect}>
    <div className="opportunity-card-head"><span className="company-mark">{job.company.slice(0, 1)}</span><div><small>{job.company}</small><h2>{job.title}</h2></div><span className={`listing-kind ${job.kind.toLowerCase()}`}>{job.kind === "INTERNAL" ? "Internal demo" : "Live external"}</span></div>
    <div className="job-facts"><span><MapPin />{job.location}</span>{job.employmentType && <span><BriefcaseBusiness />{job.employmentType}</span>}<span>Source: {job.source}</span></div>
    {job.salaryText && <b className="salary">{job.salaryText}</b>}
    <p>{job.descriptionSnippet}</p>
    <div className="chips compact">{job.requiredSkills.slice(0, 5).map((skill) => <span className="chip" key={skill}>{skill}</span>)}{!job.requiredSkills.length && <small>Detailed skills not supplied by source</small>}</div>
    {recommendation && <div className="recommendation-line">{recommendation.match ? <><Sparkles /> <b>{recommendation.match.score}% advisory match</b><span>{recommendation.match.matched.length} matched skills</span></> : <span>{recommendation.explanation}</span>}</div>}
    <div className="opportunity-actions">
      {job.kind === "EXTERNAL" && <button className="button secondary small" onClick={(e) => { e.stopPropagation(); save.mutate(); }}><Bookmark size={16} />{job.isSaved ? "Remove saved" : "Save job"}</button>}
      <button className="text-link" onClick={(e) => { e.stopPropagation(); onSelect(); }}>Analyze match <ChevronRight size={15} /></button>
      {job.kind === "INTERNAL" ? <Link to={`/jobs/${job.numericId}`}>View details</Link> : job.externalUrl && <a href={job.externalUrl} target="_blank" rel="noopener noreferrer">Apply on source <ExternalLink size={14} /></a>}
    </div>
  </article>;
}

function OpportunityPreview({ job }: { job?: Opportunity }) {
  const [result, setResult] = useState<any>();
  const match = useMutation({ mutationFn: () => api(`/api/opportunities/${job!.numericId}/match`, { method: "POST", body: "{}" }), onSuccess: setResult });
  const resume = useMutation({ mutationFn: () => api(`/api/opportunities/${job!.numericId}/resume-check`, { method: "POST", body: "{}" }), onSuccess: setResult });
  const track = useMutation({ mutationFn: () => api("/api/external-applications", { method: "POST", body: JSON.stringify({ externalJobId: job!.numericId, status: "INTERESTED" }) }) });
  if (!job) return <aside className="opportunity-preview"><FileSearch /><h2>Select an opportunity</h2><p>Review its source, skills evidence, and available analysis.</p></aside>;
  if (job.kind === "INTERNAL") return <aside className="opportunity-preview"><small>Selected opportunity</small><h2>{job.title}</h2><p>Internal employer postings use verified structured requirements.</p><Link className="button" to={`/jobs/${job.numericId}`}>Open internal listing</Link></aside>;
  return <aside className="opportunity-preview"><small>Selected opportunity</small><h2>{job.title}</h2><p>{job.company} · {job.location}</p><div className="preview-disclosure"><i />Skills extracted from snippets are unverified.</div>
    <button className="button" disabled={match.isPending} onClick={() => match.mutate()}><Sparkles size={16} /> Analyze profile match</button>
    <button className="button secondary" disabled={resume.isPending} onClick={() => resume.mutate()}><FileSearch size={16} /> Check resume match</button>
    <button className="text-link" disabled={track.isPending} onClick={() => track.mutate()}>{track.isSuccess ? "Added to tracker" : "Track as interested"}</button>
    {(match.error || resume.error) && <p className="error">{(match.error || resume.error)?.message}</p>}
    {result?.score !== undefined && <div className="mini-result"><b>{result.score}%</b><span>Advisory skills match</span><small>{result.disclosure}</small></div>}
    {result?.atsReadiness && <div className="dual-score"><div><b>{result.atsReadiness.score}</b><span>ATS readiness</span></div><div><b>{result.jobAlignment.score}</b><span>Job alignment</span></div><small>{result.disclosure}</small></div>}
    {job.externalUrl && <a className="apply-source" href={job.externalUrl} target="_blank" rel="noopener noreferrer">Open original listing <ExternalLink size={15} /></a>}
  </aside>;
}

export function SavedOpportunities() {
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["saved-opportunities"], queryFn: () => api("/api/opportunities/saved") });
  return <div className="opportunity-page"><header className="opportunity-heading compact"><div><p className="eyebrow">Candidate workspace</p><h1>Saved opportunities</h1><p>Revisit external listings and their original application pages.</p></div></header><main className="opportunity-list standalone" aria-busy={isLoading}>{data.map((row) => <OpportunityCard key={row.id} job={{ ...row.job, isSaved: true }} selected={false} onSelect={() => undefined} />)}{!isLoading && !data.length && <div className="empty"><Bookmark /><h3>No saved opportunities</h3><p>Save an external listing from Smart Job Discovery to find it here.</p><Link className="button" to="/candidate/opportunities">Discover opportunities</Link></div>}</main></div>;
}

export function ApplicationTracker() {
  const client = useQueryClient();
  const { data = [] } = useQuery<any[]>({ queryKey: ["external-applications"], queryFn: () => api("/api/external-applications") });
  const update = useMutation({ mutationFn: ({ id, status }: { id: number; status: string }) => api(`/api/external-applications/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }), onSuccess: () => client.invalidateQueries({ queryKey: ["external-applications"] }) });
  return <div className="opportunity-page"><header className="opportunity-heading compact"><div><p className="eyebrow">Manual tracking</p><h1>External application tracker</h1><p>Status is entered by you. Opening an application link never marks an application as submitted.</p></div></header><section className="panel tracker-table"><div className="tr th"><span>Opportunity</span><span>Status</span><span>Updated</span><span>Source</span></div>{data.map((row) => <div className="tr" key={row.id}><div><b>{row.externalJob.title}</b><small>{row.externalJob.company}</small></div><select value={row.status} onChange={(e) => update.mutate({ id: row.id, status: e.target.value })}>{["INTERESTED", "APPLIED_EXTERNALLY", "INTERVIEW_SCHEDULED", "OFFER_RECEIVED", "NOT_SELECTED"].map((x) => <option key={x} value={x}>{x.toLowerCase().replace(/_/g, " ")}</option>)}</select><span>{new Date(row.updatedAt).toLocaleDateString()}</span><a href={row.externalJob.externalUrl} target="_blank" rel="noopener noreferrer">{row.externalJob.source.name} <ExternalLink size={13} /></a></div>)}{!data.length && <div className="empty"><Check /><h3>No externally tracked applications</h3><p>Tracking remains manual unless a future authorized provider supplies application status.</p></div>}</section></div>;
}

export function AdminJobSources() {
  const client = useQueryClient();
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["admin-job-sources"], queryFn: () => api("/api/admin/job-sources") });
  const toggle = useMutation({ mutationFn: ({ id, isEnabled }: { id: number; isEnabled: boolean }) => api(`/api/admin/job-sources/${id}`, { method: "PATCH", body: JSON.stringify({ isEnabled }) }), onSuccess: () => client.invalidateQueries({ queryKey: ["admin-job-sources"] }) });
  return <div className="opportunity-page"><header className="opportunity-heading compact"><div><p className="eyebrow">Administration</p><h1>Job source integrations</h1><p>Only authorized providers can be enabled. Pending connectors contain no scraping logic.</p></div></header><section className="panel source-admin" aria-busy={isLoading}>{data.map((source) => <article key={source.id}><div><span className={`source-state ${source.authorizationStatus.toLowerCase()}`}><i />{source.authorizationStatus === "PENDING" ? "Integration Pending" : source.authorizationStatus}</span><h2>{source.name}</h2><p>{source.baseUrl || "No provider endpoint configured"}</p></div><button className="button secondary small" disabled={source.authorizationStatus !== "AUTHORIZED" || toggle.isPending} onClick={() => toggle.mutate({ id: source.id, isEnabled: !source.isEnabled })}>{source.isEnabled ? "Disable" : "Enable"}</button></article>)}</section></div>;
}
