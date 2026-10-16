import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronRight,
  Compass,
  FileText,
  FileSearch,
  Github,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Users,
  X,
} from "lucide-react";
import { ResumeWorkspace } from "./resume-workspace";
import {
  ApplicationTracker,
  AdminJobSources,
  OpportunitiesPage,
  SavedOpportunities,
} from "./opportunities";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calculateMatch, type MatchResult } from "@skillbridge/shared";
import "./styles.css";
type User = {
  id: number;
  name: string;
  email: string;
  role: "CANDIDATE" | "EMPLOYER" | "ADMIN";
};
type SkillRow = {
  id: number;
  level: string;
  skill: { name: string; category: string };
};
type Job = {
  id: number;
  title: string;
  description: string;
  location: string;
  arrangement: string;
  employmentType: string;
  industry: string;
  salary?: string;
  deadline?: string;
  employer: { companyName: string };
  skills: { required: boolean; level: string; skill: { name: string } }[];
};
const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});
async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!r.ok) {
    const x = await r.json().catch(() => ({}));
    throw new Error(x.error || "Request failed");
  }
  return r.status === 204 ? (undefined as T) : r.json();
}
function useMe() {
  return useQuery<User | null>({
    queryKey: ["me"],
    queryFn: () => api<User>("/api/auth/me").catch(() => null),
  });
}
function Logo() {
  return (
    <Link to="/" className="logo">
      <span>
        <Sparkles size={18} />
      </span>
      SkillBridge <b>AI</b>
    </Link>
  );
}
function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="public-header">
      <div className="nav-wrap">
        <Logo />
        <nav className={open ? "open" : ""}>
          <NavLink to="/jobs">Explore jobs</NavLink>
          <NavLink to="/how-it-works">How it works</NavLink>
          <Link className="text-link" to="/login">
            Log in
          </Link>
          <Link className="button small" to="/register">
            Get started
          </Link>
        </nav>
        <button
          className="icon-button menu"
          aria-label="Toggle navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer>
      <div>
        <Logo />
        <p>Skills-first opportunity discovery for Malaysia.</p>
        <a
          className="footer-github"
          href="https://github.com/"
          target="_blank"
          rel="noreferrer"
          aria-label="Visit GitHub"
        >
          <Github size={20} aria-hidden="true" />
          <span>GitHub</span>
        </a>
      </div>
      <div>
        <strong>Explore</strong>
        <Link to="/jobs">Jobs</Link>
        <Link to="/how-it-works">How it works</Link>
      </div>
      <div>
        <strong>Trust</strong>
        <Link to="/impact">SDG impact</Link>
        <Link to="/about">About</Link>
      </div>
      <p className="footer-note">
        Prototype demonstration. Seeded roles are not live vacancies.
      </p>
    </footer>
  );
}
function Public({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main>{children}</main>
      <Footer />
    </>
  );
}
const demoCandidate = [
  { name: "Python", level: "ADVANCED" as const },
  { name: "SQL", level: "INTERMEDIATE" as const },
  { name: "Machine Learning", level: "INTERMEDIATE" as const },
  { name: "Communication", level: "ADVANCED" as const },
];
const demoJob = {
  requiredSkills: [
    { name: "Python", level: "INTERMEDIATE" as const },
    { name: "SQL", level: "INTERMEDIATE" as const },
    { name: "Excel", level: "INTERMEDIATE" as const },
    { name: "Data Visualization", level: "INTERMEDIATE" as const },
  ],
  preferredSkills: [
    { name: "Power BI", level: "BEGINNER" as const },
    { name: "Machine Learning", level: "BEGINNER" as const },
  ],
};
function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  return (
    <div
      className="score-ring"
      style={
        {
          "--score": `${score * 3.6}deg`,
          width: size,
          height: size,
        } as React.CSSProperties
      }
    >
      <span>
        <b>{score}%</b>
        <small>match</small>
      </span>
    </div>
  );
}
function Home() {
  const [skills, setSkills] = useState(demoCandidate);
  const result = calculateMatch({ candidateSkills: skills, ...demoJob });
  const toggle = (name: string) =>
    setSkills((s) =>
      s.some((x) => x.name === name)
        ? s.filter((x) => x.name !== name)
        : [...s, { name, level: "INTERMEDIATE" }],
    );
  return (
    <Public>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Explainable skills-based matching</p>
          <h1>
            Your skills deserve the <em>right opportunity.</em>
          </h1>
          <p className="lede">
            Discover opportunities matched to your real capabilities, improve
            your resume, and bridge your career skills gap with SkillBridge AI.
          </p>
          <div className="actions">
            <Link className="button" to="/register">
              Find my career match <ChevronRight size={18} />
            </Link>
            <Link className="button secondary" to="/candidate/resume">
              Check my resume
            </Link>
          </div>
          <div className="trust-row">
            <ShieldCheck />
            <span>Transparent scoring</span>
            <span>Skills, not demographics</span>
            <span>Human decisions stay human</span>
          </div>
        </div>
        <div className="match-demo">
          <div className="demo-head">
            <div>
              <small>Resume intelligence preview</small>
              <h2>Junior Data Analyst</h2>
              <p>Nusa Digital Labs · Kuala Lumpur</p>
            </div>
            <ScoreRing score={result.score} />
          </div>
          <div
            className="demo-signals"
            aria-label="Demonstration resume analysis"
          >
            <div>
              <span>ATS readiness</span>
              <b>82/100</b>
              <small>Demonstration</small>
            </div>
            <div>
              <span>Recognized sections</span>
              <b>5 of 6</b>
              <small>Summary · Skills · Projects</small>
            </div>
          </div>
          <p className="demo-label">Your skills — select to compare</p>
          <div className="chips">
            {[
              "Python",
              "SQL",
              "Machine Learning",
              "Communication",
              "Excel",
              "Power BI",
            ].map((n) => (
              <button
                key={n}
                onClick={() => toggle(n)}
                className={
                  skills.some((x) => x.name === n) ? "chip selected" : "chip"
                }
              >
                {skills.some((x) => x.name === n) && <Check size={14} />} {n}
              </button>
            ))}
          </div>
          <div className="demo-result">
            <div>
              <span className="dot good" />
              Matched <b>{result.matched.join(", ") || "None yet"}</b>
            </div>
            <div>
              <span className="dot warn" />
              Build next{" "}
              <b>
                {[...result.missing, ...result.partial].join(", ") || "No gaps"}
              </b>
            </div>
          </div>
          <p className="fine">
            Heuristic compatibility score · recalculates from the same core
            matching logic
          </p>
        </div>
      </section>
      <section className="problem">
        <div>
          <p className="eyebrow">A clearer signal</p>
          <h2>A CV tells a story. Skills show what someone can do.</h2>
        </div>
        <p>
          Traditional screening can overlook self-taught talent, practical
          projects, and transferable abilities. SkillBridge makes job
          requirements explicit and gives every score an explanation.
        </p>
      </section>
      <section className="steps">
        <header>
          <p className="eyebrow">How it works</p>
          <h2>From capability to opportunity in three clear steps.</h2>
        </header>
        {[
          [
            Target,
            "Build your skills profile",
            "Record proficiency and optional evidence from projects, courses, or work.",
          ],
          [
            Sparkles,
            "See explainable matches",
            "Understand required coverage, proficiency alignment, and preference fit.",
          ],
          [
            GraduationCap,
            "Close the gaps",
            "Turn missing competencies into a practical learning roadmap.",
          ],
        ].map(([I, t, d], i) => (
          <article key={String(t)}>
            <span className="step-no">0{i + 1}</span>
            {React.createElement(I as any)}
            <h3>{t as string}</h3>
            <p>{d as string}</p>
          </article>
        ))}
      </section>
      <section className="feature-band">
        <div>
          <p className="eyebrow">Designed for better decisions</p>
          <h2>Useful to candidates. Actionable for employers.</h2>
        </div>
        <div className="feature-grid">
          <article>
            <Users />
            <h3>Recognize potential</h3>
            <p>
              Surface candidates through relevant competencies without using
              protected traits in scoring.
            </p>
          </article>
          <article>
            <ChartNoAxesColumnIncreasing />
            <h3>See the reasoning</h3>
            <p>
              Every match shows criterion weights, contributions, matched
              skills, and gaps.
            </p>
          </article>
          <article>
            <Compass />
            <h3>Build a pathway</h3>
            <p>
              Connect high-priority gaps with curated learning resources and
              track progress.
            </p>
          </article>
        </div>
      </section>
      <section className="sdg-strip">
        <div>
          <span>04</span>
          <b>Quality education</b>
        </div>
        <div>
          <span>08</span>
          <b>Decent work</b>
        </div>
        <div>
          <span>10</span>
          <b>Reduced inequalities</b>
        </div>
        <Link to="/impact">
          See our measurement approach <ChevronRight size={16} />
        </Link>
      </section>
      <section className="faq">
        <h2>Questions, answered plainly.</h2>
        {[
          [
            "Is the match score an employment probability?",
            "No. It is a deterministic guidance indicator based on the skills and preferences provided. It never determines eligibility.",
          ],
          [
            "Does matching use personal demographics?",
            "No. Protected personal characteristics are deliberately excluded from scoring.",
          ],
          [
            "Are these live vacancies?",
            "No. All seeded jobs and companies are fictional demonstration data for the MVP.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <section className="final-cta">
        <div>
          <h2>Put your capabilities in focus.</h2>
          <p>
            Create a profile, understand your fit, and take the next useful
            step.
          </p>
        </div>
        <Link className="button light" to="/register">
          Get started free
        </Link>
      </section>
    </Public>
  );
}
function Jobs() {
  const [q, setQ] = useState("");
  const {
    data = [],
    isLoading,
    error,
  } = useQuery<Job[]>({
    queryKey: ["jobs", q],
    queryFn: () => api(`/api/jobs?q=${encodeURIComponent(q)}`),
  });
  return (
    <Public>
      <PageHero
        eyebrow="Demonstration opportunities"
        title="Explore roles by what they require."
        text="Search 20 fictional roles across Malaysia. Sign in to calculate your personal match and apply."
      />
      <section className="listing-wrap">
        <label className="search">
          <Search />
          <span className="sr-only">Search jobs</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by role, location, or industry"
          />
        </label>
        {isLoading ? (
          <Skeleton />
        ) : error ? (
          <ErrorState />
        ) : (
          <div className="job-grid">
            {data.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        )}
      </section>
    </Public>
  );
}
function JobCard({ job, score }: { job: Job; score?: number }) {
  return (
    <article className="job-card">
      <div className="job-top">
        <span className="company-mark">{job.employer.companyName[0]}</span>
        {score !== undefined && (
          <span className="score-pill">{score}% match</span>
        )}
      </div>
      <h3>
        <Link to={`/jobs/${job.id}`}>{job.title}</Link>
      </h3>
      <p>{job.employer.companyName}</p>
      <div className="job-meta">
        <span>{job.location}</span>
        <span>{job.arrangement.toLowerCase()}</span>
        <span>{job.employmentType}</span>
      </div>
      <div className="chips compact">
        {job.skills
          .filter((s) => s.required)
          .slice(0, 4)
          .map((s) => (
            <span className="chip" key={s.skill.name}>
              {s.skill.name}
            </span>
          ))}
      </div>
      <div className="job-foot">
        <small>Demo listing</small>
        <Link to={`/jobs/${job.id}`}>
          View role <ChevronRight size={15} />
        </Link>
      </div>
    </article>
  );
}
function JobDetail() {
  const { id } = useParams();
  const { data: j, isLoading } = useQuery<Job>({
    queryKey: ["job", id],
    queryFn: () => api(`/api/jobs/${id}`),
  });
  const me = useMe();
  const apply = useMutation({
    mutationFn: () =>
      api(`/api/jobs/${id}/apply`, { method: "POST", body: "{}" }),
  });
  if (isLoading || !j)
    return (
      <Public>
        <Skeleton />
      </Public>
    );
  return (
    <Public>
      <section className="detail">
        <Link to="/jobs">← All roles</Link>
        <div className="detail-grid">
          <article>
            <span className="badge">Demonstration listing</span>
            <h1>{j.title}</h1>
            <p className="lede">
              {j.employer.companyName} · {j.location} ·{" "}
              {j.arrangement.toLowerCase()}
            </p>
            <h2>About the role</h2>
            <p>{j.description}</p>
            <h2>Required skills</h2>
            <div className="requirement-list">
              {j.skills
                .filter((x) => x.required)
                .map((x) => (
                  <div>
                    <Check />
                    <b>{x.skill.name}</b>
                    <span>{title(x.level)}</span>
                  </div>
                ))}
            </div>
            <h2>Preferred skills</h2>
            <div className="chips">
              {j.skills
                .filter((x) => !x.required)
                .map((x) => (
                  <span className="chip">{x.skill.name}</span>
                ))}
            </div>
          </article>
          <aside className="apply-card">
            <b>{j.salary || "Salary not provided"}</b>
            <p>{j.employmentType}</p>
            {apply.isSuccess ? (
              <div className="success">
                <Check /> Application submitted
              </div>
            ) : (
              <button
                className="button full"
                onClick={() =>
                  me.data?.role === "CANDIDATE"
                    ? apply.mutate()
                    : location.assign("/login")
                }
              >
                {me.data?.role === "CANDIDATE"
                  ? "Apply now"
                  : "Sign in to apply"}
              </button>
            )}
            {apply.error && <p className="error">{apply.error.message}</p>}
            {me.data?.role === "CANDIDATE" && (
              <Link
                className="resume-before-apply"
                to="/candidate/resume/job-match"
              >
                <FileSearch size={16} /> Analyze a resume for this role
              </Link>
            )}
            <p className="fine">
              Match scores support human decision-making and never guarantee
              employment.
            </p>
          </aside>
        </div>
      </section>
    </Public>
  );
}
function PageHero({
  eyebrow,
  title: heading,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="page-hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{heading}</h1>
      <p>{text}</p>
    </section>
  );
}
function How() {
  return (
    <Public>
      <PageHero
        eyebrow="How it works"
        title="A shared language for talent and opportunity."
        text="Candidates understand where they fit. Employers make requirements explicit. Both sides see the same reasoning."
      />
      <section className="split-flow">
        <Flow
          title="For candidates"
          icon={<Target />}
          steps={[
            "Create a practical skills profile",
            "Explore ranked job matches",
            "Understand every score and gap",
            "Apply and track your progress",
          ]}
        />
        <Flow
          title="For employers"
          icon={<BriefcaseBusiness />}
          steps={[
            "Describe the role and competencies",
            "Set required and preferred skills",
            "Review applicants with explanations",
            "Keep the final decision human",
          ]}
        />
      </section>
    </Public>
  );
}
function Flow({
  title: heading,
  icon,
  steps,
}: {
  title: string;
  icon: React.ReactNode;
  steps: string[];
}) {
  return (
    <article>
      <header>
        {icon}
        <h2>{heading}</h2>
      </header>
      {steps.map((s, i) => (
        <div className="flow-step">
          <span>{i + 1}</span>
          <p>{s}</p>
        </div>
      ))}
    </article>
  );
}
function About() {
  return (
    <Public>
      <PageHero
        eyebrow="About SkillBridge"
        title="Beyond qualifications. Connecting skills to opportunities."
        text="A hackathon-ready HRTech prototype built for transparent, inclusive talent discovery in Malaysia."
      />
      <section className="prose-grid">
        <article>
          <h2>Our vision</h2>
          <p>
            Make practical competencies easier to recognize, explain, and
            develop — whether they came from university, work, projects, or
            self-directed learning.
          </p>
        </article>
        <article>
          <h2>Our approach</h2>
          <p>
            A local-first React, Express, Prisma, and SQLite platform with
            deterministic matching. Essential features do not depend on paid AI
            services.
          </p>
        </article>
        <article>
          <h2>Our boundary</h2>
          <p>
            SkillBridge informs people; it does not automate rejection, verify
            self-assessments, or claim that a compatibility score predicts
            hiring outcomes.
          </p>
        </article>
      </section>
    </Public>
  );
}
function Impact() {
  const { data } = useQuery<any>({
    queryKey: ["impact"],
    queryFn: () => api("/api/impact"),
  });
  return (
    <Public>
      <PageHero
        eyebrow="SDG impact"
        title="Measure platform activity. Never overclaim outcomes."
        text="These prototype indicators describe use of the platform. They do not prove wider socioeconomic impact."
      />
      <section className="impact-metrics">
        {[
          ["Skills profiles", data?.profiles ?? "—"],
          ["Match analyses", data?.matches ?? "—"],
          ["Learning milestones", data?.learning ?? "—"],
          ["Applications", data?.applications ?? "—"],
        ].map(([l, v]) => (
          <div>
            <b>{v}</b>
            <span>{l}</span>
            <small>Demonstration data</small>
          </div>
        ))}
      </section>
      <section className="sdg-cards">
        <article className="sdg4">
          <b>SDG 4</b>
          <h2>Quality education</h2>
          <p>
            Skill-gap analysis and curated resources support Target 4.4:
            relevant skills for employment.
          </p>
        </article>
        <article className="sdg8">
          <b>SDG 8</b>
          <h2>Decent work</h2>
          <p>
            Skills-based discovery supports more informed connections between
            people and opportunities.
          </p>
        </article>
        <article className="sdg10">
          <b>SDG 10</b>
          <h2>Reduced inequalities</h2>
          <p>
            Transparent criteria can recognize alternative learning pathways
            while excluding protected traits.
          </p>
        </article>
      </section>
    </Public>
  );
}
function AuthPage({ register = false }: { register?: boolean }) {
  const nav = useNavigate(),
    client = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "candidate@skillbridge.demo",
    password: "Demo123!",
    role: "CANDIDATE",
  });
  const mutation = useMutation({
    mutationFn: () =>
      api<User>(`/api/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: (u) => {
      client.setQueryData(["me"], u);
      nav(
        u.role === "CANDIDATE"
          ? "/candidate/dashboard"
          : u.role === "EMPLOYER"
            ? "/employer/dashboard"
            : "/admin/dashboard",
      );
    },
  });
  return (
    <main className="auth-page">
      <Link to="/" className="auth-back">
        ← Back home
      </Link>
      <form
        className="auth-card"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <Logo />
        <p className="eyebrow">
          {register ? "Create your account" : "Welcome back"}
        </p>
        <h1>{register ? "Start with your skills." : "Sign in to continue."}</h1>
        {register && (
          <>
            <label>
              Full name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Account type
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="CANDIDATE">Candidate</option>
                <option value="EMPLOYER">Employer</option>
              </select>
            </label>
          </>
        )}
        <label>
          Email address
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>
        {mutation.error && <p className="error">{mutation.error.message}</p>}
        <button className="button full" disabled={mutation.isPending}>
          {mutation.isPending
            ? "Please wait…"
            : register
              ? "Create account"
              : "Sign in"}
        </button>
        <p>
          {register ? "Already registered?" : "New to SkillBridge?"}{" "}
          <Link to={register ? "/login" : "/register"}>
            {register ? "Log in" : "Create account"}
          </Link>
        </p>
        {!register && (
          <div className="demo-creds">
            <b>Demo accounts</b>
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, email: "candidate@skillbridge.demo" })
              }
            >
              Candidate
            </button>
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, email: "employer@skillbridge.demo" })
              }
            >
              Employer
            </button>
            <small>Password: Demo123!</small>
          </div>
        )}
      </form>
    </main>
  );
}
function Guard({
  role,
  children,
}: {
  role: User["role"];
  children: React.ReactNode;
}) {
  const { data, isLoading } = useMe();
  if (isLoading) return <Skeleton />;
  return data?.role === role ? (
    <>{children}</>
  ) : (
    <Navigate to={data ? "/unauthorized" : "/login"} replace />
  );
}
const candidateNav = [
  ["/candidate/dashboard", LayoutDashboard, "Overview"],
  ["/candidate/opportunities", Search, "Discover jobs"],
  ["/candidate/recommended-jobs", Sparkles, "Recommended"],
  ["/candidate/resume", FileSearch, "Resume intelligence"],
  ["/candidate/matches", Sparkles, "Job matches"],
  ["/candidate/skills", Target, "My skills"],
  ["/candidate/skill-gap", ChartNoAxesColumnIncreasing, "Skill gaps"],
  ["/candidate/roadmap", Compass, "Roadmap"],
  ["/candidate/applications", FileText, "Applications"],
  ["/candidate/saved-jobs", BriefcaseBusiness, "Saved jobs"],
  ["/candidate/application-tracker", FileText, "External tracker"],
  ["/candidate/profile", Users, "Profile"],
];
function Shell({
  children,
  employer = false,
}: {
  children: React.ReactNode;
  employer?: boolean;
}) {
  const { data } = useMe();
  const nav = useNavigate(),
    client = useQueryClient();
  const links = employer
    ? [
        ["/employer/dashboard", LayoutDashboard, "Overview"],
        ["/employer/jobs/create", BriefcaseBusiness, "Post a job"],
        ["/employer/applications", FileText, "Applications"],
      ]
    : candidateNav;
  return (
    <div className="shell">
      <aside>
        <Logo />
        <nav>
          {links.map(([to, I, label]: any) => (
            <NavLink to={to} key={to}>
              <I size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <button
          onClick={async () => {
            await api("/api/auth/logout", { method: "POST" });
            client.clear();
            nav("/");
          }}
        >
          <LogOut /> Sign out
        </button>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <small>
              {employer ? "Employer workspace" : "Candidate workspace"}
            </small>
            <b>{data?.name}</b>
          </div>
          <ThemeButton />
        </header>
        {children}
      </main>
    </div>
  );
}
function ThemeButton() {
  const [dark, setDark] = useState(() => localStorage.theme === "dark");
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.theme = dark ? "dark" : "light";
  }, [dark]);
  return (
    <button
      className="icon-button"
      aria-label="Toggle theme"
      onClick={() => setDark(!dark)}
    >
      {dark ? <Sun /> : <Moon />}
    </button>
  );
}
function CandidateDashboard() {
  const { data: p } = useQuery<any>({
    queryKey: ["profile"],
    queryFn: () => api("/api/candidate/profile"),
  });
  const { data: m = [] } = useQuery<any[]>({
    queryKey: ["matches"],
    queryFn: () => api("/api/candidate/matches"),
  });
  const { data: a = [] } = useQuery<any[]>({
    queryKey: ["applications"],
    queryFn: () => api("/api/candidate/applications"),
  });
  const { data: resumes = [] } = useQuery<any[]>({
    queryKey: ["resumes"],
    queryFn: () => api("/api/resume"),
  });
  const latestReadiness = resumes[0]?.analyses?.[0]?.readinessScore;
  const chart = m.slice(0, 6).map((x) => ({
    name: x.job.title.split(" ").slice(0, 2).join(" "),
    score: x.match.score,
  }));
  return (
    <Shell>
      <DashboardTitle
        title={`Good ${greeting()}, ${p?.user?.name || "Aina"}`}
        text="Here’s where your skills can take you next."
      />
      <div className="metric-row">
        <Metric
          primary
          label="Best match"
          value={`${m[0]?.match.score ?? 0}%`}
          note={m[0]?.job.title || "Add skills to begin"}
        />
        <Metric
          label="Skills registered"
          value={p?.skills?.length ?? 0}
          note="Self-reported competencies"
        />
        <Metric
          label="Active applications"
          value={a.length}
          note="Across demo roles"
        />
        <Metric
          label="Resume readiness"
          value={latestReadiness === undefined ? "—" : `${latestReadiness}/100`}
          note={
            latestReadiness === undefined
              ? "Analyze a resume to begin"
              : "Latest actual analysis"
          }
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h2>Opportunity fit</h2>
              <p>Your six highest current matches</p>
            </div>
            <Link to="/candidate/matches">View all</Link>
          </div>
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={chart}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar
                dataKey="score"
                fill="var(--primary)"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="panel next-panel">
          <p className="eyebrow">Highest priority</p>
          <h2>{m[0]?.match.missing?.[0] || "Profile ready"}</h2>
          <p>
            {m[0]?.match.missing?.length
              ? "Building this missing required skill would improve your strongest target match."
              : "You meet the required skills for your top match."}
          </p>
          <Link className="button secondary" to="/candidate/skill-gap">
            Open skill gaps
          </Link>
        </section>
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Recommended roles</h2>
          <Link to="/candidate/matches">All matches</Link>
        </div>
        <div className="mini-list">
          {m.slice(0, 3).map((x) => (
            <div>
              <ScoreRing score={x.match.score} size={58} />
              <div>
                <b>{x.job.title}</b>
                <span>
                  {x.job.employer.companyName} · {x.job.location}
                </span>
              </div>
              <Link to={`/jobs/${x.job.id}`}>
                Review <ChevronRight />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
function Matches() {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["matches"],
    queryFn: () => api("/api/candidate/matches"),
  });
  const [selected, setSelected] = useState<any>();
  useEffect(() => {
    if (data.length && !selected) setSelected(data[0]);
  }, [data, selected]);
  return (
    <Shell>
      <DashboardTitle
        title="Your job matches"
        text="Scores update when your skills or preferences change."
      />
      {isLoading ? (
        <Skeleton />
      ) : (
        <div className="match-layout">
          <div className="match-list">
            {data.map((x) => (
              <button
                className={selected?.job.id === x.job.id ? "active" : ""}
                onClick={() => setSelected(x)}
              >
                <ScoreRing score={x.match.score} size={64} />
                <span>
                  <b>{x.job.title}</b>
                  <small>
                    {x.job.employer.companyName} · {x.match.category}
                  </small>
                </span>
                <ChevronRight />
              </button>
            ))}
          </div>
          {selected && <MatchDetail item={selected} />}
        </div>
      )}
    </Shell>
  );
}
function MatchDetail({ item }: { item: any }) {
  const r: MatchResult = item.match;
  return (
    <section className="panel match-detail">
      <div className="match-title">
        <div>
          <span className="badge">{r.category}</span>
          <h2>{item.job.title}</h2>
          <p>
            {item.job.employer.companyName} · {item.job.location}
          </p>
        </div>
        <ScoreRing score={r.score} />
      </div>
      <p className="notice">
        <ShieldCheck /> Guidance indicator, not an employment probability or
        eligibility decision.
      </p>
      <h3>Why this score</h3>
      <p>{r.explanation}</p>
      <div className="criteria">
        {r.criteria.map((c) => (
          <div>
            <span>
              {c.label}
              <small>{Math.round(c.weight)}% weight</small>
            </span>
            <div>
              <i style={{ width: `${c.score}%` }} />
            </div>
            <b>{c.score}%</b>
          </div>
        ))}
      </div>
      <div className="two-col">
        <div>
          <h3>Matched required skills</h3>
          {r.matched.map((x) => (
            <p className="skill-line good">
              <Check />
              {x}
            </p>
          ))}
        </div>
        <div>
          <h3>Build next</h3>
          {[...r.missing, ...r.partial].map((x) => (
            <p className="skill-line warn">
              <Target />
              {x}
            </p>
          ))}
        </div>
      </div>
      <Link className="button" to={`/jobs/${item.job.id}`}>
        View role
      </Link>
    </section>
  );
}
function Skills() {
  const client = useQueryClient();
  const { data: p } = useQuery<any>({
    queryKey: ["profile"],
    queryFn: () => api("/api/candidate/profile"),
  });
  const [form, setForm] = useState({
    name: "",
    category: "Programming",
    level: "INTERMEDIATE",
  });
  const add = useMutation({
    mutationFn: () =>
      api("/api/candidate/skills", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["profile"] });
      client.invalidateQueries({ queryKey: ["matches"] });
      setForm({ ...form, name: "" });
    },
  });
  const del = useMutation({
    mutationFn: (id: number) =>
      api(`/api/candidate/skills/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["profile"] }),
  });
  return (
    <Shell>
      <DashboardTitle
        title="My skills"
        text="Record what you can do and the proficiency you currently claim."
      />
      <div className="editor-layout">
        <form
          className="panel form-panel"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
        >
          <h2>Add or update a skill</h2>
          <label>
            Skill name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Python"
            />
          </label>
          <label>
            Category
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {[
                "Programming",
                "Web Development",
                "Data Analytics",
                "Artificial Intelligence",
                "Cloud Computing",
                "Cybersecurity",
                "Communication",
                "Design",
              ].map((x) => (
                <option>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Self-assessed proficiency
            <select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
            >
              {["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"].map((x) => (
                <option>{title(x)}</option>
              ))}
            </select>
          </label>
          <button className="button" disabled={add.isPending}>
            Save skill
          </button>
          <p className="fine">
            Self-assessment is not an independently verified certification.
          </p>
        </form>
        <section className="panel">
          <h2>Registered skills</h2>
          <div className="skill-table">
            {p?.skills?.map((x: SkillRow) => (
              <div>
                <span className="skill-icon">{x.skill.name[0]}</span>
                <div>
                  <b>{x.skill.name}</b>
                  <small>{x.skill.category}</small>
                </div>
                <span className="level">{title(x.level)}</span>
                <button
                  className="icon-button danger"
                  onClick={() => del.mutate(x.id)}
                  aria-label={`Remove ${x.skill.name}`}
                >
                  <X />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}
function SkillGap() {
  const { data: m = [] } = useQuery<any[]>({
    queryKey: ["matches"],
    queryFn: () => api("/api/candidate/matches"),
  });
  const top = m[0];
  const gaps = top ? [...top.match.missing, ...top.match.partial] : [];
  return (
    <Shell>
      <DashboardTitle
        title="Skills gap analysis"
        text="Prioritized from your current strongest job match."
      />
      <div className="target-banner">
        <div>
          <p className="eyebrow">Target role</p>
          <h2>{top?.job.title || "No target available"}</h2>
          <p>{top?.job.employer.companyName}</p>
        </div>
        {top && <ScoreRing score={top.match.score} />}
      </div>
      <div className="gap-grid">
        {gaps.map((g: string, i: number) => (
          <article className="panel">
            <span className="priority">Priority {i + 1}</span>
            <Target />
            <h3>{g}</h3>
            <p>
              {top.match.missing.includes(g)
                ? "Missing required skill"
                : "Proficiency below the role requirement"}
            </p>
            <button className="button secondary">Mark in progress</button>
          </article>
        ))}
      </div>
      {!gaps.length && (
        <Empty text="No required gaps in your top match. Explore another role to compare." />
      )}
    </Shell>
  );
}
function Roadmap() {
  const phases = [
    "Strengthen data foundations",
    "Build visualization fluency",
    "Create a portfolio analysis",
    "Practice stakeholder communication",
  ];
  const [done, setDone] = useState<number[]>([]);
  return (
    <Shell>
      <DashboardTitle
        title="Career roadmap"
        text="A curated demonstration pathway for a Data Analyst target."
      />
      <section className="roadmap">
        {phases.map((p, i) => (
          <article className={done.includes(i) ? "done" : ""}>
            <button
              onClick={() =>
                setDone((d) =>
                  d.includes(i) ? d.filter((x) => x !== i) : [...d, i],
                )
              }
            >
              {done.includes(i) ? <Check /> : <span>{i + 1}</span>}
            </button>
            <div>
              <small>Phase {i + 1}</small>
              <h2>{p}</h2>
              <p>
                {
                  [
                    "Review SQL querying and spreadsheet analysis fundamentals.",
                    "Learn chart selection and build interactive Power BI reports.",
                    "Analyze a public dataset and document decisions and limitations.",
                    "Present findings with a concise executive summary.",
                  ][i]
                }
              </p>
            </div>
          </article>
        ))}
      </section>
    </Shell>
  );
}
function Applications() {
  const { data = [] } = useQuery<any[]>({
    queryKey: ["applications"],
    queryFn: () => api("/api/candidate/applications"),
  });
  return (
    <Shell>
      <DashboardTitle
        title="Applications"
        text="Track the roles you have submitted through this prototype."
      />
      <section className="panel">
        <div className="table">
          <div className="tr th">
            <span>Role</span>
            <span>Company</span>
            <span>Status</span>
            <span>Submitted</span>
          </div>
          {data.map((a) => (
            <div className="tr">
              <b>{a.job.title}</b>
              <span>{a.job.employer.companyName}</span>
              <span className="status">{title(a.status)}</span>
              <span>{new Date(a.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
        {!data.length && (
          <Empty text="No applications yet. Your strongest matches are ready to explore." />
        )}
      </section>
    </Shell>
  );
}
function Profile() {
  const client = useQueryClient();
  const { data: p } = useQuery<any>({
    queryKey: ["profile"],
    queryFn: () => api("/api/candidate/profile"),
  });
  const [form, setForm] = useState<any>();
  useEffect(() => {
    if (p && !form) setForm(p);
  }, [p, form]);
  const save = useMutation({
    mutationFn: () =>
      api("/api/candidate/profile", {
        method: "PATCH",
        body: JSON.stringify(form),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["profile"] }),
  });
  if (!form)
    return (
      <Shell>
        <Skeleton />
      </Shell>
    );
  return (
    <Shell>
      <DashboardTitle
        title="Profile & preferences"
        text="Private by default. You choose whether employers may discover your profile."
      />
      <form
        className="panel profile-form"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="form-grid">
          <label>
            Professional headline
            <input
              value={form.headline || ""}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
            />
          </label>
          <label>
            Location
            <input
              value={form.location || ""}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </label>
          <label className="wide">
            Short biography
            <textarea
              value={form.bio || ""}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </label>
          <label>
            Preferred roles
            <input
              value={form.preferredRoles || ""}
              onChange={(e) =>
                setForm({ ...form, preferredRoles: e.target.value })
              }
            />
          </label>
          <label>
            Preferred locations
            <input
              value={form.preferredLocations || ""}
              onChange={(e) =>
                setForm({ ...form, preferredLocations: e.target.value })
              }
            />
          </label>
          <label>
            Work arrangements
            <input
              value={form.arrangements || ""}
              onChange={(e) =>
                setForm({ ...form, arrangements: e.target.value })
              }
              placeholder="HYBRID,REMOTE"
            />
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={form.discoverable}
              onChange={(e) =>
                setForm({ ...form, discoverable: e.target.checked })
              }
            />
            <span>
              Allow relevant employers to discover this skills profile
            </span>
          </label>
        </div>
        <button className="button">
          {save.isPending ? "Saving…" : "Save changes"}
        </button>
        {save.isSuccess && <span className="success-inline">Saved</span>}
      </form>
    </Shell>
  );
}
function EmployerDashboard() {
  const { data } = useQuery<any>({
    queryKey: ["employer"],
    queryFn: () => api("/api/employer/dashboard"),
  });
  return (
    <Shell employer>
      <DashboardTitle
        title="Employer overview"
        text="Manage demonstration roles and review candidate activity."
      />
      <div className="metric-row">
        <Metric
          primary
          label="Published jobs"
          value={data?.jobs?.length ?? 0}
          note="Fictional demo listings"
        />
        <Metric
          label="Applications"
          value={data?.applications?.length ?? 0}
          note="Across your roles"
        />
        <Metric
          label="In review"
          value={
            data?.applications?.filter((x: any) => x.status === "REVIEWING")
              .length ?? 0
          }
          note="Awaiting human action"
        />
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Your job postings</h2>
          <Link to="/employer/jobs/create">Create posting</Link>
        </div>
        <div className="table">
          <div className="tr th">
            <span>Role</span>
            <span>Location</span>
            <span>Arrangement</span>
            <span>Applicants</span>
          </div>
          {data?.jobs?.slice(0, 8).map((j: any) => (
            <div className="tr">
              <b>{j.title}</b>
              <span>{j.location}</span>
              <span>{title(j.arrangement)}</span>
              <span>{j.applications.length}</span>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
function CreateJob() {
  const nav = useNavigate();
  const [form, setForm] = useState<any>({
    title: "",
    description: "",
    location: "Kuala Lumpur",
    arrangement: "HYBRID",
    employmentType: "Full-time",
    industry: "Technology",
    salary: "",
    requirements: [{ name: "", level: "INTERMEDIATE", required: true }],
  });
  const mutation = useMutation({
    mutationFn: () =>
      api("/api/employer/jobs", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => nav("/employer/dashboard"),
  });
  return (
    <Shell employer>
      <DashboardTitle
        title="Create a job posting"
        text="State competencies clearly so candidates can understand their fit."
      />
      <form
        className="panel profile-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="form-grid">
          <label>
            Job title
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            Location
            <input
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </label>
          <label>
            Arrangement
            <select
              value={form.arrangement}
              onChange={(e) =>
                setForm({ ...form, arrangement: e.target.value })
              }
            >
              {["HYBRID", "REMOTE", "ONSITE"].map((x) => (
                <option>{title(x)}</option>
              ))}
            </select>
          </label>
          <label>
            Industry
            <input
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
          </label>
          <label className="wide">
            Role description
            <textarea
              required
              minLength={20}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
        </div>
        <h2>Skills</h2>
        {form.requirements.map((r: any, i: number) => (
          <div className="requirement-editor">
            <input
              required
              placeholder="Skill name"
              value={r.name}
              onChange={(e) => {
                const a = [...form.requirements];
                a[i] = { ...r, name: e.target.value };
                setForm({ ...form, requirements: a });
              }}
            />
            <select
              value={r.level}
              onChange={(e) => {
                const a = [...form.requirements];
                a[i] = { ...r, level: e.target.value };
                setForm({ ...form, requirements: a });
              }}
            >
              {["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"].map((x) => (
                <option>{title(x)}</option>
              ))}
            </select>
            <label>
              <input
                type="checkbox"
                checked={r.required}
                onChange={(e) => {
                  const a = [...form.requirements];
                  a[i] = { ...r, required: e.target.checked };
                  setForm({ ...form, requirements: a });
                }}
              />{" "}
              Required
            </label>
          </div>
        ))}
        <button
          type="button"
          className="text-link"
          onClick={() =>
            setForm({
              ...form,
              requirements: [
                ...form.requirements,
                { name: "", level: "INTERMEDIATE", required: false },
              ],
            })
          }
        >
          + Add another skill
        </button>
        {mutation.error && <p className="error">{mutation.error.message}</p>}
        <button className="button">Publish demonstration job</button>
      </form>
    </Shell>
  );
}
function DashboardTitle({
  title: heading,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="dashboard-title">
      <div>
        <h1>{heading}</h1>
        <p>{text}</p>
      </div>
      <span className="badge">Demo workspace</span>
    </div>
  );
}
function Metric({
  label,
  value,
  note,
  primary = false,
}: {
  label: string;
  value: any;
  note: string;
  primary?: boolean;
}) {
  return (
    <article className={primary ? "metric primary" : "metric"}>
      <span>{label}</span>
      <b>{value}</b>
      <small>{note}</small>
    </article>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <Compass />
      <h3>Nothing here yet</h3>
      <p>{text}</p>
    </div>
  );
}
function Skeleton() {
  return (
    <div className="skeleton">
      <i />
      <i />
      <i />
    </div>
  );
}
function ErrorState() {
  return (
    <div className="empty">
      <X />
      <h3>Unable to load</h3>
      <p>Check that the local API is running, then try again.</p>
    </div>
  );
}
function title(s: string) {
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}
function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/jobs/:id" element={<JobDetail />} />
      <Route path="/how-it-works" element={<How />} />
      <Route path="/about" element={<About />} />
      <Route path="/impact" element={<Impact />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage register />} />
      <Route
        path="/candidate/dashboard"
        element={
          <Guard role="CANDIDATE">
            <CandidateDashboard />
          </Guard>
        }
      />
      <Route
        path="/candidate/matches"
        element={
          <Guard role="CANDIDATE">
            <Matches />
          </Guard>
        }
      />
      <Route
        path="/candidate/opportunities"
        element={
          <Guard role="CANDIDATE">
            <Shell><OpportunitiesPage /></Shell>
          </Guard>
        }
      />
      <Route
        path="/candidate/recommended-jobs"
        element={
          <Guard role="CANDIDATE">
            <Shell><OpportunitiesPage recommended /></Shell>
          </Guard>
        }
      />
      <Route
        path="/candidate/saved-jobs"
        element={
          <Guard role="CANDIDATE">
            <Shell><SavedOpportunities /></Shell>
          </Guard>
        }
      />
      <Route
        path="/candidate/application-tracker"
        element={
          <Guard role="CANDIDATE">
            <Shell><ApplicationTracker /></Shell>
          </Guard>
        }
      />
      <Route
        path="/candidate/skills"
        element={
          <Guard role="CANDIDATE">
            <Skills />
          </Guard>
        }
      />
      <Route
        path="/candidate/skill-gap"
        element={
          <Guard role="CANDIDATE">
            <SkillGap />
          </Guard>
        }
      />
      <Route
        path="/candidate/roadmap"
        element={
          <Guard role="CANDIDATE">
            <Roadmap />
          </Guard>
        }
      />
      <Route
        path="/candidate/applications"
        element={
          <Guard role="CANDIDATE">
            <Applications />
          </Guard>
        }
      />
      <Route
        path="/candidate/profile"
        element={
          <Guard role="CANDIDATE">
            <Profile />
          </Guard>
        }
      />
      <Route
        path="/candidate/resume/*"
        element={
          <Guard role="CANDIDATE">
            <Shell>
              <ResumeWorkspace />
            </Shell>
          </Guard>
        }
      />
      <Route
        path="/candidate/assessment"
        element={<Navigate to="/candidate/skills" />}
      />
      <Route
        path="/candidate/settings"
        element={<Navigate to="/candidate/profile" />}
      />
      <Route
        path="/employer/dashboard"
        element={
          <Guard role="EMPLOYER">
            <EmployerDashboard />
          </Guard>
        }
      />
      <Route
        path="/employer/jobs/create"
        element={
          <Guard role="EMPLOYER">
            <CreateJob />
          </Guard>
        }
      />
      <Route
        path="/employer/applications"
        element={
          <Guard role="EMPLOYER">
            <EmployerDashboard />
          </Guard>
        }
      />
      <Route
        path="/employer/*"
        element={<Navigate to="/employer/dashboard" />}
      />
      <Route
        path="/admin/job-sources"
        element={
          <Guard role="ADMIN">
            <Public><AdminJobSources /></Public>
          </Guard>
        }
      />
      <Route
        path="/admin/*"
        element={
          <Guard role="ADMIN">
            <Public>
              <PageHero
                eyebrow="Administration"
                title="Platform administration"
                text="The MVP protects this role. Advanced moderation interfaces are documented as a limitation."
              />
            </Public>
          </Guard>
        }
      />
      <Route
        path="/unauthorized"
        element={
          <Public>
            <PageHero
              eyebrow="Access denied"
              title="This workspace belongs to another role."
              text="Return to your dashboard or sign in with the appropriate demonstration account."
            />
          </Public>
        }
      />
      <Route
        path="*"
        element={
          <Public>
            <PageHero
              eyebrow="404"
              title="That page could not be found."
              text="The link may be outdated. Use the navigation to continue."
            />
          </Public>
        }
      />
    </Routes>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
