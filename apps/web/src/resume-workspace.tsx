import { useRef, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Check,
  ChevronRight,
  FileCheck2,
  FileSearch,
  History,
  Lightbulb,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

type Resume = {
  id: number;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  extractedText: string;
  uploadedAt: string;
  analyses: Analysis[];
  jobMatches: JobMatch[];
};
type Analysis = {
  id: number;
  resumeId: number;
  readinessScore: number;
  readinessBreakdown: {
    key: string;
    label: string;
    score: number;
    weight: number;
    contribution: number;
  }[];
  extractedSections: Record<string, string>;
  detectedSkills: string[];
  parsingIssues: string[];
  recommendations: Recommendation[];
  analyzedAt: string;
  suggestions?: Suggestion[];
  resume?: { originalFilename: string };
  jobMatch?: JobMatch | null;
};
type Recommendation = {
  category?: string;
  priority: string;
  explanation: string;
  suggestedText?: string;
};
type Suggestion = Recommendation & { id: number; status: string };
type JobMatch = {
  id: number;
  jobAlignmentScore: number;
  scoreBreakdown: {
    key: string;
    label: string;
    score: number;
    weight: number;
  }[];
  matchedSkills: {
    required: string[];
    preferred: string[];
    supported: string[];
    unclear: string[];
  };
  missingSkills: string[];
  recommendations: Recommendation[];
  jobTitle?: string;
  analyzedAt: string;
};
type Job = { id: number; title: string; employer: { companyName: string } };
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers:
      options?.body instanceof FormData
        ? options.headers
        : { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Request failed");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

const tabs = [
  ["/candidate/resume", "My resume", UploadCloud],
  ["/candidate/resume/ats-checker", "ATS checker", FileCheck2],
  ["/candidate/resume/job-match", "Job match", FileSearch],
  ["/candidate/resume/improve", "Improvements", Lightbulb],
  ["/candidate/resume/history", "History", History],
] as const;

export function ResumeWorkspace() {
  const location = useLocation();
  return (
    <>
      <div className="dashboard-title">
        <div>
          <h1>Resume intelligence</h1>
          <p>Optimize your resume. Match your skills. Unlock opportunities.</p>
        </div>
        <span className="badge">Private workspace</span>
      </div>
      <nav className="resume-tabs" aria-label="Resume tools">
        {tabs.map(([to, label, Icon]) => (
          <NavLink end={to === "/candidate/resume"} to={to}>
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>
      {location.pathname.endsWith("ats-checker") ? (
        <AtsChecker />
      ) : location.pathname.endsWith("job-match") ? (
        <JobMatcher />
      ) : location.pathname.endsWith("improve") ? (
        <Improvements />
      ) : location.pathname.endsWith("history") ? (
        <HistoryPage />
      ) : (
        <ResumeManager />
      )}
    </>
  );
}

function useResumes() {
  return useQuery<Resume[]>({
    queryKey: ["resumes"],
    queryFn: () => api("/api/resume"),
  });
}
function latest(resumes: Resume[] | undefined) {
  return resumes?.[0];
}

function ResumeManager() {
  const client = useQueryClient(),
    input = useRef<HTMLInputElement>(null),
    { data = [], isLoading } = useResumes();
  const [drag, setDrag] = useState(false);
  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("resume", file);
      return api<Resume>("/api/resume/upload", { method: "POST", body: form });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["resumes"] }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/resume/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["resumes"] }),
  });
  const receive = (file?: File) => {
    if (file) upload.mutate(file);
  };
  return (
    <div className="resume-page">
      <section
        className={drag ? "upload-zone dragging" : "upload-zone"}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          receive(e.dataTransfer.files[0]);
        }}
      >
        <div className="upload-icon">
          <UploadCloud />
        </div>
        <p className="eyebrow">Resume upload</p>
        <h2>Turn your document into useful evidence.</h2>
        <p>
          Upload your resume to discover how well it matches your target career
          opportunities.
        </p>
        <input
          ref={input}
          hidden
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => receive(e.target.files?.[0])}
        />
        <button
          className="button"
          onClick={() => input.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? "Extracting text…" : "Browse files"}
        </button>
        <small>
          Text-based PDF, DOCX, or TXT · maximum 5 MB · stored privately
        </small>
        {upload.error && <p className="error">{upload.error.message}</p>}
      </section>
      <section className="panel resume-library">
        <div className="panel-head">
          <div>
            <h2>Resume versions</h2>
            <p>
              Each upload remains separate for honest before-and-after
              comparison.
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className="resume-loading" />
        ) : data.length ? (
          data.map((r, index) => (
            <article className="resume-row">
              <span className="file-mark">
                <FileCheck2 />
              </span>
              <div>
                <b>{r.originalFilename}</b>
                <small>
                  Version {data.length - index} · {formatBytes(r.fileSize)} ·{" "}
                  {new Date(r.uploadedAt).toLocaleDateString()}
                </small>
              </div>
              <span>
                {r.analyses[0]
                  ? `${r.analyses[0].readinessScore}/100`
                  : "Not analyzed"}
              </span>
              <Link to="/candidate/resume/ats-checker">
                Review <ChevronRight />
              </Link>
              <button
                className="icon-button danger"
                aria-label={`Delete ${r.originalFilename}`}
                onClick={() =>
                  confirm("Delete this private resume and all analyses?") &&
                  remove.mutate(r.id)
                }
              >
                <Trash2 />
              </button>
            </article>
          ))
        ) : (
          <EmptyResume />
        )}
      </section>
    </div>
  );
}

function AtsChecker() {
  const client = useQueryClient(),
    { data } = useResumes(),
    resume = latest(data);
  const analysis = resume?.analyses?.[0];
  const analyze = useMutation({
    mutationFn: () =>
      api<Analysis>(`/api/resume/${resume!.id}/analyze`, {
        method: "POST",
        body: "{}",
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["resumes"] }),
  });
  return (
    <div className="resume-page">
      {!resume ? (
        <NoResume />
      ) : (
        <>
          {!analysis ? (
            <section className="analysis-intro">
              <div>
                <p className="eyebrow">ATS readiness</p>
                <h2>Check what can actually be read.</h2>
                <p>
                  We evaluate extracted text, recognizable sections, contact
                  information, evidence, and clarity using transparent local
                  rules.
                </p>
                <button
                  className="button"
                  onClick={() => analyze.mutate()}
                  disabled={analyze.isPending}
                >
                  {analyze.isPending ? "Analyzing…" : "Analyze latest resume"}
                </button>
                {analyze.error && (
                  <p className="error">{analyze.error.message}</p>
                )}
              </div>
              <DocumentPreview text={resume.extractedText} />
            </section>
          ) : (
            <AnalysisDashboard analysis={analysis} resume={resume} />
          )}
        </>
      )}
    </div>
  );
}

function AnalysisDashboard({
  analysis,
  resume,
}: {
  analysis: Analysis;
  resume: Resume;
}) {
  const client = useQueryClient();
  const [sections, setSections] = useState(analysis.extractedSections);
  const [selected, setSelected] = useState<string[]>(analysis.detectedSkills);
  const importSkills = useMutation({
    mutationFn: () =>
      api(`/api/resume/${resume.id}/import-skills`, {
        method: "POST",
        body: JSON.stringify({ skills: selected }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["profile"] }),
  });
  return (
    <>
      <section className="score-hero">
        <Score value={analysis.readinessScore} label="ATS readiness" />
        <div>
          <span className="badge">
            {readinessLabel(analysis.readinessScore)}
          </span>
          <h2>
            Your resume is readable. Now make the evidence easier to find.
          </h2>
          <p>
            This is SkillBridge AI’s estimated resume readiness score, not an
            official score from a commercial ATS. Different employers and
            recruitment systems may process resumes differently.
          </p>
          <small>
            Analyzed {new Date(analysis.analyzedAt).toLocaleString()}
          </small>
        </div>
      </section>
      <div className="ats-grid">
        <section className="panel">
          <h2>Score breakdown</h2>
          <div className="criteria">
            {analysis.readinessBreakdown.map((c) => (
              <div>
                <span>
                  {c.label}
                  <small>{c.weight}% weight</small>
                </span>
                <div>
                  <i style={{ width: `${c.score}%` }} />
                </div>
                <b>{c.score}%</b>
              </div>
            ))}
          </div>
        </section>
        <section className="panel issue-panel">
          <h2>Parsing review</h2>
          {analysis.parsingIssues.length ? (
            analysis.parsingIssues.map((i) => (
              <p>
                <X />
                {i}
              </p>
            ))
          ) : (
            <p className="positive">
              <Check />
              No major parsing issues detected.
            </p>
          )}
        </section>
      </div>
      <section className="panel section-editor">
        <div className="panel-head">
          <div>
            <h2>Recognized sections</h2>
            <p>
              Review and correct the preview. Edits here are not written back to
              the uploaded file.
            </p>
          </div>
        </div>
        <div className="section-grid">
          {Object.entries(sections)
            .filter(([, value]) => value)
            .map(([key, value]) => (
              <label>
                <span>{pretty(key)}</span>
                <textarea
                  value={value}
                  onChange={(e) =>
                    setSections({ ...sections, [key]: e.target.value })
                  }
                />
              </label>
            ))}
        </div>
      </section>
      <section className="panel detected-skills">
        <div>
          <h2>Detected skills</h2>
          <p>
            Choose which unverified resume mentions to import at Beginner
            proficiency. Existing ratings are never overwritten.
          </p>
        </div>
        <div className="chips">
          {analysis.detectedSkills.map((skill) => (
            <label
              className={selected.includes(skill) ? "chip selected" : "chip"}
            >
              <input
                type="checkbox"
                checked={selected.includes(skill)}
                onChange={() =>
                  setSelected((x) =>
                    x.includes(skill)
                      ? x.filter((s) => s !== skill)
                      : [...x, skill],
                  )
                }
              />
              {selected.includes(skill) && <Check />}
              {skill}
            </label>
          ))}
        </div>
        <button
          className="button secondary"
          disabled={!selected.length || importSkills.isPending}
          onClick={() => importSkills.mutate()}
        >
          {importSkills.isSuccess ? "Imported" : "Import selected skills"}
        </button>
      </section>
    </>
  );
}

function JobMatcher() {
  const { data: resumes } = useResumes(),
    resume = latest(resumes);
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["jobs", "resume"],
    queryFn: () => api("/api/jobs"),
  });
  const [jobId, setJobId] = useState<number>();
  const [manual, setManual] = useState("");
  const [mode, setMode] = useState<"existing" | "manual">("existing");
  const [result, setResult] = useState<JobMatch>();
  const match = useMutation({
    mutationFn: () =>
      api<JobMatch>(`/api/resume/${resume!.id}/job-match`, {
        method: "POST",
        body: JSON.stringify(
          mode === "existing"
            ? { jobId }
            : {
                manualJobDescription: manual,
                jobTitle: "Pasted job description",
              },
        ),
      }),
    onSuccess: setResult,
  });
  if (!resume)
    return (
      <div className="resume-page">
        <NoResume />
      </div>
    );
  return (
    <div className="resume-page">
      <section className="job-match-builder">
        <div>
          <p className="eyebrow">Resume-to-job alignment</p>
          <h2>Different question. Different score.</h2>
          <p>
            ATS readiness checks document structure and parseability. Job
            alignment checks whether this resume communicates evidence relevant
            to one role.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            match.mutate();
          }}
        >
          <div className="mode-switch">
            <button
              type="button"
              className={mode === "existing" ? "active" : ""}
              onClick={() => setMode("existing")}
            >
              SkillBridge job
            </button>
            <button
              type="button"
              className={mode === "manual" ? "active" : ""}
              onClick={() => setMode("manual")}
            >
              Paste description
            </button>
          </div>
          {mode === "existing" ? (
            <label>
              Target job
              <select
                required
                value={jobId || ""}
                onChange={(e) => setJobId(+e.target.value)}
              >
                <option value="">Choose a job</option>
                {jobs.map((j) => (
                  <option value={j.id}>
                    {j.title} — {j.employer.companyName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Job description
              <textarea
                required
                minLength={30}
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Paste the role responsibilities and requirements…"
              />
            </label>
          )}
          <button className="button" disabled={match.isPending}>
            {match.isPending ? "Comparing evidence…" : "Calculate alignment"}
          </button>
          {match.error && <p className="error">{match.error.message}</p>}
        </form>
      </section>
      {result && <JobMatchResult result={result} />}
    </div>
  );
}

function JobMatchResult({ result }: { result: JobMatch }) {
  return (
    <>
      <section className="score-hero secondary-score">
        <Score value={result.jobAlignmentScore} label="Job alignment" />
        <div>
          <span className="badge">{result.jobTitle || "Target role"}</span>
          <h2>
            {result.jobAlignmentScore >= 70
              ? "Relevant evidence is visible."
              : "Some role evidence is missing or unclear."}
          </h2>
          <p>
            A missing term does not prove you lack the underlying ability. It
            means the parser did not find clear evidence in this resume.
          </p>
        </div>
      </section>
      <div className="ats-grid">
        <section className="panel">
          <h2>Matched skills</h2>
          <SkillGroup title="Required" items={result.matchedSkills.required} />
          <SkillGroup
            title="Preferred"
            items={result.matchedSkills.preferred}
          />
          <SkillGroup
            title="Supported by evidence"
            items={result.matchedSkills.supported}
          />
        </section>
        <section className="panel">
          <h2>Missing or unclear</h2>
          <SkillGroup
            title="Not recognized"
            items={result.missingSkills}
            warning
          />
          <SkillGroup
            title="Mentioned without project or experience evidence"
            items={result.matchedSkills.unclear}
            warning
          />
        </section>
      </div>
      <Recommendations items={result.recommendations} />
    </>
  );
}

function Improvements() {
  const { data: resumes } = useResumes(),
    resume = latest(resumes);
  const { data = [] } = useQuery<Suggestion[]>({
    queryKey: ["resume-suggestions", resume?.id],
    enabled: !!resume,
    queryFn: () => api(`/api/resume/${resume!.id}/suggestions`),
  });
  const client = useQueryClient();
  const update = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api(`/api/resume/suggestions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["resume-suggestions"] }),
  });
  return (
    <div className="resume-page">
      {!resume ? (
        <NoResume />
      ) : (
        <section className="panel suggestions">
          <div className="panel-head">
            <div>
              <h2>Evidence-first improvements</h2>
              <p>
                These suggestions improve how genuine information is presented.
                They never invent achievements or qualifications.
              </p>
            </div>
          </div>
          {data.length ? (
            data.map((s) => (
              <article>
                <span className={`priority ${s.priority.toLowerCase()}`}>
                  {pretty(s.priority)} priority
                </span>
                <h3>{s.category}</h3>
                <p>{s.explanation}</p>
                {s.suggestedText && <blockquote>{s.suggestedText}</blockquote>}
                <div>
                  <button
                    className="button secondary"
                    disabled={s.status === "ACCEPTED"}
                    onClick={() =>
                      update.mutate({ id: s.id, status: "ACCEPTED" })
                    }
                  >
                    {s.status === "ACCEPTED" ? (
                      <>
                        <Check />
                        Accepted
                      </>
                    ) : (
                      "Accept guidance"
                    )}
                  </button>
                  <button
                    className="text-link"
                    onClick={() =>
                      update.mutate({ id: s.id, status: "REJECTED" })
                    }
                  >
                    Dismiss
                  </button>
                </div>
              </article>
            ))
          ) : (
            <EmptyResume text="Analyze your latest resume to create contextual recommendations." />
          )}
        </section>
      )}
    </div>
  );
}

function HistoryPage() {
  const { data = [] } = useQuery<Analysis[]>({
    queryKey: ["resume-history"],
    queryFn: () => api("/api/resume/history"),
  });
  const [a, setA] = useState<number>(),
    [b, setB] = useState<number>();
  const first = data.find((x) => x.id === a),
    second = data.find((x) => x.id === b);
  return (
    <div className="resume-page">
      <section className="panel history-table">
        <div className="panel-head">
          <div>
            <h2>Analysis history</h2>
            <p>
              Compare actual stored analyses. A higher score does not guarantee
              a recruiting outcome.
            </p>
          </div>
        </div>
        {data.map((row, index) => (
          <article>
            <span className="version">V{data.length - index}</span>
            <div>
              <b>{row.resume?.originalFilename}</b>
              <small>{new Date(row.analyzedAt).toLocaleString()}</small>
            </div>
            <strong>{row.readinessScore}/100</strong>
            <span>
              {row.jobMatch
                ? `${row.jobMatch.jobAlignmentScore}/100 job fit`
                : "No job match"}
            </span>
          </article>
        ))}
      </section>
      {data.length >= 2 && (
        <section className="panel compare">
          <h2>Compare two analyses</h2>
          <div>
            <select value={a || ""} onChange={(e) => setA(+e.target.value)}>
              <option value="">Choose first</option>
              {data.map((x) => (
                <option value={x.id}>
                  {x.resume?.originalFilename} · {x.readinessScore}
                </option>
              ))}
            </select>
            <select value={b || ""} onChange={(e) => setB(+e.target.value)}>
              <option value="">Choose second</option>
              {data.map((x) => (
                <option value={x.id}>
                  {x.resume?.originalFilename} · {x.readinessScore}
                </option>
              ))}
            </select>
          </div>
          {first && second && (
            <p className="comparison-copy">
              Readiness changed by{" "}
              <b>
                {second.readinessScore - first.readinessScore > 0 ? "+" : ""}
                {second.readinessScore - first.readinessScore} points
              </b>
              . Review the criterion breakdowns to understand why; this change
              does not predict hiring success.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function Score({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="score-large"
      style={{ "--score": `${value * 3.6}deg` } as CSSProperties}
    >
      <span>
        <b>{value}</b>
        <small>/100</small>
        <em>{label}</em>
      </span>
    </div>
  );
}
function DocumentPreview({ text }: { text: string }) {
  return (
    <div className="document-preview">
      <span />
      <span />
      <span />
      <p>{text.slice(0, 900)}</p>
    </div>
  );
}
function SkillGroup({
  title,
  items,
  warning = false,
}: {
  title: string;
  items: string[];
  warning?: boolean;
}) {
  return (
    <div className="skill-group">
      <h3>{title}</h3>
      <div className="chips">
        {items.length ? (
          items.map((x) => (
            <span className={warning ? "chip warning" : "chip selected"}>
              {warning ? <X /> : <Check />}
              {x}
            </span>
          ))
        ) : (
          <small>None recognized</small>
        )}
      </div>
    </div>
  );
}
function Recommendations({ items }: { items: Recommendation[] }) {
  return (
    <section className="panel suggestions">
      <h2>Improvement priorities</h2>
      {items.length ? (
        items.map((r, i) => (
          <article>
            <span className={`priority ${r.priority.toLowerCase()}`}>
              {pretty(r.priority)} priority
            </span>
            <h3>{i === 0 ? "Start here" : "Then improve"}</h3>
            <p>{r.explanation}</p>
          </article>
        ))
      ) : (
        <p>
          No role-specific gaps were recognized. Review for factual accuracy
          before applying.
        </p>
      )}
    </section>
  );
}
function NoResume() {
  return (
    <section className="empty resume-empty">
      <UploadCloud />
      <h2>Upload a resume first</h2>
      <p>The checker needs an actual text-based PDF, DOCX, or TXT document.</p>
      <Link className="button" to="/candidate/resume">
        Open resume upload
      </Link>
    </section>
  );
}
function EmptyResume({ text = "No resume versions yet." }: { text?: string }) {
  return (
    <div className="empty">
      <FileSearch />
      <h3>Nothing to analyze yet</h3>
      <p>{text}</p>
    </div>
  );
}
const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
const pretty = (s: string) =>
  s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
const readinessLabel = (score: number) =>
  score >= 85
    ? "Strong readiness"
    : score >= 70
      ? "Good readiness"
      : score >= 50
        ? "Needs improvement"
        : "Significant improvements suggested";
