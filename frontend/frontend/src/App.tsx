import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Download,
  FileText,
  BarChart3,
  ClipboardList,
  Cpu,
  Loader2,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Settings,
  UserRound,
  Users,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  Application,
  ApplicationCreate,
  DOCUMENT_TYPES,
  Document,
  Notification,
  STATUS_LABEL,
  Summary,
  User,
  adminApi,
  applicationApi,
  authApi,
  clearSession,
  hasSession,
  notificationApi,
  setSession,
} from './api'

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('') || '?'
  )
}

function formatMoney(value?: number | null): string {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fieldLabel(key: string): string {
  return key.replace(/_/g, ' ')
}

function prettyValue(key: string, value: string | number | null): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') {
    if (/income|balance|credits|tax|amount/.test(key)) return `₹${formatMoney(value)}`
    return String(value)
  }
  return value
}

interface Toast {
  message: string
  kind: 'success' | 'error'
}

function useToast() {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const notify = (message: string, kind: 'success' | 'error' = 'success') => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ message, kind })
    timer.current = setTimeout(() => setToast(null), 3200)
  }

  const element = toast ? (
    <div className={`toast ${toast.kind}`}>
      {toast.kind === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
      {toast.message}
      <button aria-label="dismiss" onClick={() => setToast(null)}>
        <X size={14} />
      </button>
    </div>
  ) : null

  return { notify, element }
}

/* ========================================================================== */
/*  LANDING PAGE                                                              */
/* ========================================================================== */

const SECTIONS = [
  { n: '01', title: 'Dashboard', text: 'Every loan application in one sorted, glanceable place.' },
  { n: '02', title: 'New loan application + upload', text: 'Create a case, then drop in payslips, statements and KYC.' },
  { n: '03', title: 'AI document processing', text: 'Process uploaded files and prepare them for structured extraction.' },
  {
    n: '04',
    title: 'Extraction + inconsistency detection',
    text: 'Figures are extracted and cross-checked against the dataset. Mismatches over 10% are flagged.',
  },
  { n: '05', title: 'AI loan summary', text: 'A concise readout gives reviewers the evidence in one place.' },
  { n: '06', title: 'Human review', text: 'A person reviews the flags, the notes and the trail — then decides.' },
]

const BETTER = [
  {
    title: 'simplicity.',
    items: [
      'A single drop-point for payslips, statements, tax returns and KYC.',
      'Every document tagged by type so the case stays organised.',
      'One dashboard for applicants, reviewers and admins.',
    ],
  },
  {
    title: 'accuracy.',
    items: [
      'Figures are parsed straight from the uploaded documents.',
      'Income is compared across payslip, statement and tax return.',
      'Anything off by more than 10% is flagged for a human.',
    ],
  },
  {
    title: 'speed.',
    items: [
      'No re-typing, no spreadsheets, no chasing emails.',
      'Reviewers see extracted data and flags in one screen.',
      'Approve, request more info or reject with a single click.',
    ],
  },
]

const DEMO_USERS = [
  { role: 'Applicant', email: 'applicant@demo.com', note: 'Create cases, upload documents, get notified.' },
  { role: 'Loan Officer', email: 'reviewer@demo.com', note: 'Verify documents, check flags, approve or reject.' },
  { role: 'Admin', email: 'admin@demo.com', note: 'See everything, assign reviewers, manage users.' },
]

function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <div className="landing">
      <header className="nav">
        <div className="container nav-inner">
          <button className="brand" onClick={() => scrollTo('top')}>
            <span className="brand-mark">Ll</span>
            <span className="brand-name">LoanAI</span>
          </button>
          <nav className="nav-links">
            <button onClick={() => scrollTo('sections')}>What&apos;s inside</button>
            <button onClick={() => scrollTo('approach')}>Approach</button>
            <button onClick={() => scrollTo('demo')}>Demo</button>
          </nav>
          <div className="nav-cta">
            <button className="btn-link" onClick={onGetStarted}>
              Sign in
            </button>
            <button className="btn-black" onClick={onGetStarted}>
              Get started <ArrowRight size={15} />
            </button>
          </div>
          <button className="hamburger" aria-label="menu" onClick={() => setMenuOpen((v) => !v)}>
            <span />
            <span />
            <span />
          </button>
        </div>
        {menuOpen && (
          <div className="nav-mobile">
            <button onClick={() => scrollTo('sections')}>What&apos;s inside</button>
            <button onClick={() => scrollTo('approach')}>Approach</button>
            <button onClick={() => scrollTo('demo')}>Demo</button>
            <button className="btn-black" onClick={onGetStarted}>
              Get started
            </button>
          </div>
        )}
      </header>

      <section className="hero-yellow" id="top">
        <div className="flag-black" />
        <div className="container">
          <div className="hero-inner">
            <span className="kicker">AI-powered loan document processing</span>
            <h1>
              Loan documents, <span className="care">verified</span> end to end.
            </h1>
            <h2 className="hero-sub">AI-assisted loan document processing with human decisions.</h2>
            <p>
              Applicants upload paperwork. The figures are pulled out, cross-checked against the dataset, and any
              mismatch is flagged for a human who makes the final call.
            </p>
            <div className="hero-actions">
              <button className="btn-black btn-lg" onClick={onGetStarted}>
                Enter the workspace <ArrowRight size={16} />
              </button>
              <button className="btn-link btn-lg" onClick={() => scrollTo('sections')}>
                See what&apos;s inside
              </button>
            </div>
            <div className="key-words">Extract. Verify. Flag. Decide.</div>
          </div>
        </div>
      </section>

      <section className="manifesto">
        <div className="container">
          <div className="manifesto-grid">
            <div className="manifesto-content">
              <h2>
                Our job is simple: <span className="care-word">extract</span>, <span className="word">verify</span>,
                and let a <span className="word">human</span> decide.
              </h2>
              <div className="spacer" />
              <p className="lead">Checking loan documents is all we do.</p>
              <p>
                By removing manual re-typing and cross-checking every figure against the synthetic dataset, LoanAI keeps loan
                underwriting honest — and lets reviewers focus on judgement instead of paperwork.
              </p>
            </div>
            <div className="manifesto-aside">
              <div className="big-num">06</div>
              <span className="small-caps">product sections</span>
              <ul className="check-list">
                <li>
                  <Check size={14} /> Role-based access for all three roles
                </li>
                <li>
                  <Check size={14} /> Document upload with type tagging
                </li>
                <li>
                  <Check size={14} /> Error detection on the given dataset
                </li>
                <li>
                  <Check size={14} /> Full audit trail on every decision
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section-rows" id="sections">
        <div className="container">
          <div className="s-head">
            <span className="kicker">What&apos;s inside</span>
            <h2>Six parts, one workspace.</h2>
          </div>
          <ol className="section-rows-list">
            {SECTIONS.map((s) => (
              <li key={s.n}>
                <span className="row-num">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <ArrowRight size={18} className="row-arrow" />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="better-black" id="approach">
        <div className="flag-yellow" />
        <div className="container">
          <div className="better-black-grid">
            <div className="better-black-copy">
              <h3 className="h3-title">A better way</h3>
              <div className="spacer" />
              <p className="lead-light">
                LoanAI was built with a clear mission: <br />
                verifiable, honest loan reviews.
              </p>
              <div className="spacer" />
              <p>
                Every figure an applicant uploads is extracted and compared with the rest. We don&apos;t guess — we
                cross-check against the dataset and surface anything that doesn&apos;t add up.
              </p>
            </div>
            <ul className="plus-list">
              <li>
                <span className="plus">+</span> Documents stay in one place.
              </li>
              <li>
                <span className="plus">+</span> Figures are extracted automatically.
              </li>
              <li>
                <span className="plus">+</span> Differences over 10% are flagged.
              </li>
              <li>
                <span className="plus">+</span> Humans make the final call.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="better-yellow">
        <div className="container">
          {BETTER.map((b) => (
            <div key={b.title} className="better-block">
              <h3>
                Better through <span className="care">{b.title}</span>
              </h3>
              <ul className="plus-bullets">
                {b.items.map((it) => (
                  <li key={it}>
                    <span className="plus">+</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="demo" id="demo">
        <div className="container">
          <div className="s-head">
            <span className="kicker">Spin it up</span>
            <h2>Play with the demo accounts.</h2>
            <p>
              One password for all three roles: <code>demo-pass-123</code>
            </p>
          </div>
          <div className="demo-table">
            {DEMO_USERS.map((d) => (
              <div key={d.role} className="demo-row">
                <span className="demo-role">{d.role}</span>
                <span className="demo-note">{d.note}</span>
                <code className="demo-email">{d.email}</code>
              </div>
            ))}
          </div>
          <div className="demo-cta">
            <button className="btn-black btn-lg" onClick={onGetStarted}>
              Sign in with a demo account <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2>
            A better loan review experience with <span className="nowrap">LoanAI.</span>
          </h2>
          <p className="cta-sub">Ready to see the workspace?</p>
          <button className="btn-yellow btn-lg" onClick={onGetStarted}>
            Get started <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <span className="brand">
            <span className="brand-mark">Ll</span>
            <span className="brand-name-light">LoanAI</span>
          </span>
          <p>Loan application workspace · extract, verify, decide.</p>
          <div className="footer-tags">
            <span>React</span>
            <span>FastAPI</span>
            <span>Supabase</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ========================================================================== */
/*  AUTH                                                                      */
/* ========================================================================== */

function LoginScreen({ onAuthed, onBack }: { onAuthed: (user: User) => void; onBack?: () => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { notify, element } = useToast()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'signup') {
        await authApi.signup(fullName, email, password)
        notify('Account created — now sign in')
        setMode('login')
        setPassword('')
        return
      }
      const auth = await authApi.login(email, password)
      setSession(auth)
      const user = await authApi.me()
      onAuthed(user)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const quickFill = (demoEmail: string) => {
    setMode('login')
    setEmail(demoEmail)
    setPassword('demo-pass-123')
    setError('')
  }

  return (
    <div className="auth-screen">
      <div className="flag-black" />
      <div className="auth-card">
        {onBack && (
          <button className="auth-back" onClick={onBack}>
            ← Back to landing
          </button>
        )}
        <div className="auth-brand">
          <span className="brand-mark">Ll</span>
          <span className="brand-name">LoanAI</span>
        </div>
        <h1>{mode === 'login' ? 'Sign in to the workspace.' : 'Create an applicant account.'}</h1>
        <p className="auth-sub">
          {mode === 'login'
            ? 'Create applications, upload documents and review cases.'
            : 'Register to start your first loan application.'}
        </p>

        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
            Sign in
          </button>
          <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')}>
            New account
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={mode === 'signup' ? 8 : undefined}
              required
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="btn-black btn-block" disabled={busy}>
            {busy ? <Loader2 className="spin" size={16} /> : <ShieldCheck size={16} />}
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="demo-quick">
          <span className="demo-quick-label">One-tap demo login</span>
          <div className="demo-quick-row">
            <button onClick={() => quickFill('applicant@demo.com')}>Applicant</button>
            <button onClick={() => quickFill('reviewer@demo.com')}>Loan Officer</button>
            <button onClick={() => quickFill('admin@demo.com')}>Admin</button>
          </div>
          <p className="auth-hint">
            Any account · password <code>demo-pass-123</code>
          </p>
        </div>
      </div>
      {element}
    </div>
  )
}

/* ========================================================================== */
/*  DASHBOARD                                                                 */
/* ========================================================================== */

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { notify, element } = useToast()

  const [applications, setApplications] = useState<Application[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [documents, setDocuments] = useState<Document[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reviewers, setReviewers] = useState<User[]>([])
  const [adminUsers, setAdminUsers] = useState<User[]>([])

  const [files, setFiles] = useState<File[]>([])
  const [docType, setDocType] = useState<string>(DOCUMENT_TYPES[0])
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const [newAppOpen, setNewAppOpen] = useState(false)
  const [loanAmount, setLoanAmount] = useState('')
  const [loanPurpose, setLoanPurpose] = useState('')

  const [reviewNotes, setReviewNotes] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const [activePage, setActivePage] = useState('Dashboard')

  const selected: Application | undefined = applications.find((a) => a.id === selectedId)

  const isReviewer = user.role === 'reviewer' || user.role === 'admin'
  const isAdmin = user.role === 'admin'
  const roleLabel = user.role === 'reviewer' ? 'Loan Officer' : user.role === 'admin' ? 'Admin' : 'Applicant'

  const navItems: Array<[string, LucideIcon]> = user.role === 'admin'
    ? [
        ['Dashboard', BarChart3],
        ['All Applications', ClipboardList],
        ['All Applicants', Users],
        ['Loan Reviewers', ShieldCheck],
        ['Documents', FileText],
        ['AI Processing', Cpu],
        ['Analytics', BarChart3],
        ['Audit Logs', ClipboardList],
        ['Notifications', Bell],
        ['Settings', Settings],
      ]
    : user.role === 'reviewer'
      ? [
          ['Dashboard', BarChart3],
          ['Assigned Applications', ClipboardList],
          ['Applicant Details', UserRound],
          ['Loan Details', ClipboardList],
          ['Documents', FileText],
          ['AI Document Analysis', Cpu],
          ['Missing Documents', FileText],
          ['Inconsistency Detection', AlertTriangle],
          ['AI Processing Summary', ScanSearch],
          ['Human Review', ShieldCheck],
          ['Notifications', Bell],
          ['Profile / Settings', Settings],
        ]
      : [
          ['Dashboard', BarChart3],
          ['Apply for Loan', Plus],
          ['My Applications', ClipboardList],
          ['My Documents', FileText],
          ['Upload Documents', Upload],
          ['Document Requests', Mail],
          ['Application Status', CheckCircle2],
          ['Notifications', Bell],
          ['Profile / Settings', Settings],
        ]

  async function refreshApplications() {
    try {
      const apps = await applicationApi.list()
      setApplications(apps)
      if (!apps.some((a) => a.id === selectedId)) {
        const next = apps.length ? apps[0] : null
        setSelectedId(next ? next.id : '')
      } else if (!selectedId && apps.length) {
        setSelectedId(apps[0].id)
      }
    } catch (err) {
      notify((err as Error).message, 'error')
    }
  }

  async function refreshNotifications() {
    try {
      setNotifications(await notificationApi.list())
    } catch {
      /* non-fatal */
    }
  }

  useEffect(() => {
    refreshApplications()
    refreshNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const refreshTimer = window.setInterval(refreshNotifications, 10000)
    return () => window.clearInterval(refreshTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setDocuments([])
      setSummary(null)
      return
    }
    let cancelled = false
    setBusy(true)
    applicationApi
      .documents(selectedId)
      .then((docs) => {
        if (cancelled) return
        setDocuments(docs)
        return applicationApi.summary(selectedId).then((s) => {
          if (!cancelled) setSummary(s)
        })
      })
      .catch((err) => notify((err as Error).message, 'error'))
      .finally(() => !cancelled && setBusy(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => {
    if (isAdmin && reviewers.length === 0) {
      adminApi
        .users('reviewer')
        .then((res) => setReviewers(res.users))
        .catch(() => /* non-fatal */ undefined)
    }
  }, [isAdmin, reviewers.length])

  useEffect(() => {
    if (isAdmin && adminUsers.length === 0) {
      adminApi.users().then((res) => setAdminUsers(res.users)).catch(() => undefined)
    }
  }, [isAdmin, adminUsers.length])

  const unread = notifications.filter((n) => !n.read).length

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    try {
      await action()
      notify(success)
      await refreshApplications()
      if (selectedId) {
        setSummary(await applicationApi.summary(selectedId).catch(() => null))
      }
    } catch (err) {
      notify((err as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const createApplication = async (e: FormEvent) => {
    e.preventDefault()
    const payload: ApplicationCreate = {
      loan_amount: loanAmount ? Number(loanAmount) : null,
      loan_purpose: loanPurpose || null,
    }
    await run(() => applicationApi.create(payload), 'Application created')
    setNewAppOpen(false)
    setLoanAmount('')
    setLoanPurpose('')
  }

  const addFiles = (incoming: FileList | File[]) => {
    const selectedFiles = Array.from(incoming)
    if (!selectedFiles.length) return
    if (!selected) return notify('Select an application first', 'error')
    setFiles((prev) => [...prev, ...selectedFiles])
    notify(`${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} added`)
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.currentTarget.value = ''
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const uploadAll = async () => {
    if (!selected || !files.length) return
    setBusy(true)
    try {
      for (const file of files) {
        await applicationApi.uploadDocument(selected.id, file, docType)
      }
      notify(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`)
      setFiles([])
      setDocuments(await applicationApi.documents(selected.id))
    } catch (err) {
      notify((err as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const runProcessing = async () => {
    if (!selected) return
    await run(() => applicationApi.process(selected.id), 'Verification complete')
  }

  const exportCSV = () => {
    const rows = [
      ['Field', 'Extracted', 'Reported', 'Match'],
      ['Loan Amount', `₹${formatMoney(selected?.loan_amount)}`, 'Application', '—'],
      ['Annual Income', `₹${formatMoney(selected?.income_annum)}`, 'Application', '—'],
      ['CIBIL Score', String(selected?.cibil_score ?? '—'), 'Application', '—'],
      ['Loan Term (months)', String(selected?.loan_term ?? '—'), 'Application', '—'],
      ['Status', STATUS_LABEL[selected?.status || ''] || selected?.status || '—', '—', '—'],
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'loan-review.csv'
    a.click()
    URL.revokeObjectURL(url)
    notify('Audit CSV downloaded')
  }

  const reviewDecision = async (decision: string) => {
    if (!selected) return
    await run(
      () => applicationApi.review(selected.id, decision, reviewNotes),
      `Application ${STATUS_LABEL[decision].toLowerCase()}`
    )
    setReviewNotes('')
  }

  const statusClass = (status: string) => 'status-pill ' + (status || 'pending').toLowerCase().replace(/[\s_]+/g, '-')

  const dot = (label: string, value: string | number | null | undefined) => ({
    label,
    value: value === null || value === undefined || value === '' ? '—' : String(value),
  })

  const detailStats = selected
    ? [
        dot('Loan amount', selected.loan_amount != null ? `₹${formatMoney(selected.loan_amount)}` : null),
        dot('Annual income', selected.income_annum != null ? `₹${formatMoney(selected.income_annum)}` : null),
        dot('CIBIL score', selected.cibil_score),
        dot('Term', selected.loan_term != null ? `${selected.loan_term} mo` : null),
        dot('Dependents', selected.no_of_dependents),
        dot('Education', selected.education),
      ]
    : []

  const extractionReady = !!summary && summary.summary_ready
  const extractedRows = extractionReady && summary
    ? documents.map((doc) => ({
        doc,
        fields: summary.extracted_fields?.[doc.id] || {},
      }))
    : []

  const hasFlags = extractionReady && summary && summary.inconsistencies.length > 0
  const hasMissing = extractionReady && summary && summary.missing_documents.length > 0
  const applicationMetrics = [
    { label: 'Total applications', value: applications.length },
    { label: 'AI processed', value: applications.filter((app) => ['PROCESSED', 'APPROVED', 'REJECTED'].includes(app.status)).length },
    { label: 'Review queue', value: applications.filter((app) => ['PENDING', 'NEEDS_MORE_INFO'].includes(app.status)).length },
    { label: 'Decisions', value: applications.filter((app) => ['APPROVED', 'REJECTED'].includes(app.status)).length },
  ]
  const workflowSteps = [
    { label: 'Submitted', active: true },
    { label: 'AI Processing', active: ['PROCESSING', 'PROCESSED', 'NEEDS_MORE_INFO', 'APPROVED', 'REJECTED'].includes(selected?.status || '') },
    { label: 'Under Review', active: ['PROCESSED', 'APPROVED', 'REJECTED'].includes(selected?.status || '') },
    { label: 'Decision', active: ['APPROVED', 'REJECTED'].includes(selected?.status || '') },
  ]

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <span className="brand-mark">Ll</span>
            <span className="brand-name">LoanAI</span>
            <span className="header-divider" />
            <span className="header-tag">Workspace</span>
          </button>
        </div>
        <div className="header-right">
          <div className="notif-wrap">
            <button className="icon-btn" aria-label="notifications" onClick={() => setNotifOpen((v) => !v)}>
              <Bell size={18} />
              {unread > 0 && <span className="notif-badge">{unread}</span>}
            </button>
            {notifOpen && (
              <div className="notif-panel">
                <div className="notif-head">
                  <strong>Notifications</strong>
                  <button className="btn-text" onClick={() => notificationApi.markAllRead().then(refreshNotifications)}>
                    Mark all read
                  </button>
                </div>
                <div className="notif-list">
                  {notifications.length === 0 && <p className="empty">No notifications yet</p>}
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      className={`notif-item ${n.read ? '' : 'unread'}`}
                      onClick={() => notificationApi.markRead(n.id).then(refreshNotifications)}
                    >
                      <span className="notif-dot" />
                      <span className="notif-body">
                        <strong>{n.title}</strong>
                        <small>{n.body || ''}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="status-badge live">
            <span className="status-dot" />Live
          </div>
          <div className="user-chip">
            <div className="user-avatar">{initials(user.full_name)}</div>
            <div className="user-meta">
              <strong>{user.full_name}</strong>
              <small>{roleLabel}</small>
            </div>
          </div>
          <button className="icon-btn" aria-label="logout" onClick={onLogout}>
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <main className="main">
        <div className="workspace-shell">
          <aside className="workspace-sidebar">
            <div className="workspace-role">
              <span className="workspace-role-dot" />
              <div>
                <strong>{roleLabel} workspace</strong>
                <small>Secure access</small>
              </div>
            </div>
            <nav className="workspace-nav" aria-label={`${roleLabel} navigation`}>
              {navItems.map(([label, Icon]) => (
                <button
                  key={label}
                  className={`workspace-nav-item ${activePage === label ? 'active' : ''}`}
                  onClick={() => setActivePage(label)}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
            <div className="workspace-security">
              <ShieldCheck size={16} />
              <span>JWT protected<br />role-based access</span>
            </div>
          </aside>

          <div className="workspace-content">
        <div className="page-head">
          <div>
            <h1>{activePage}</h1>
            <p className="subtitle">
              {activePage === 'Dashboard'
                ? 'Monitor applications, documents, AI analysis and human decisions in one place.'
                : `${activePage} for the ${roleLabel.toLowerCase()} workspace.`}
            </p>
          </div>
          <div className="page-actions">
            {isReviewer && (
              <button className="btn-secondary" onClick={refreshApplications}>
                <RefreshCw size={15} /> Refresh
              </button>
            )}
            {!isReviewer && (
              <button className="btn-black" onClick={() => setNewAppOpen((v) => !v)}>
                <Plus size={16} /> New Application
              </button>
            )}
          </div>
        </div>

        {selected && (
          <div className="workflow-tracker" aria-label="Application status">
            {workflowSteps.map((step, index) => (
              <div key={step.label} className={`workflow-step ${step.active ? 'active' : ''}`}>
                <span className="workflow-dot">{step.active ? <Check size={13} /> : index + 1}</span>
                <span>{step.label}</span>
                {index < workflowSteps.length - 1 && <span className="workflow-line" />}
              </div>
            ))}
          </div>
        )}

        {isAdmin && activePage !== 'Dashboard' && (
          <section className="admin-page-content">
            {activePage === 'All Applications' && (
              <>
                <div className="admin-page-heading"><ClipboardList size={20} /><div><h2>All Applications</h2><p>Review every application loaded into the LoanAI workspace.</p></div></div>
                <div className="admin-application-table">
                  <div className="admin-application-header"><span>Application</span><span>Amount</span><span>Status</span><span>Created</span></div>
                  {applications.map((app) => <button className="admin-application-row" key={app.id} onClick={() => { setSelectedId(app.id); setActivePage('Dashboard') }}><strong>Loan {app.id.slice(0, 8)}</strong><span>₹{formatMoney(app.loan_amount)}</span><span className={statusClass(app.status)}>{STATUS_LABEL[app.status] || app.status}</span><span>{formatDate(app.created_at)}</span></button>)}
                  {!applications.length && <p className="empty">No applications returned by the API.</p>}
                </div>
              </>
            )}
            {(activePage === 'All Applicants' || activePage === 'Loan Reviewers') && (
              <>
                <div className="admin-page-heading"><Users size={20} /><div><h2>{activePage}</h2><p>Manage applicants, Loan Officers, and administrators.</p></div></div>
                <div className="admin-summary-strip"><strong>{adminUsers.length}</strong><span>registered users</span></div>
                <div className="admin-table">
                  {adminUsers.filter((adminUser) => activePage === 'All Applicants' ? adminUser.role === 'applicant' : adminUser.role === 'reviewer').map((adminUser) => <div className="admin-table-row" key={adminUser.id}><span className="admin-avatar">{initials(adminUser.full_name)}</span><strong>{adminUser.full_name}</strong><span>{adminUser.email}</span><span className="role-badge">{adminUser.role === 'reviewer' ? 'Loan Officer' : adminUser.role}</span></div>)}
                  {!adminUsers.length && <p className="empty">No users returned by the admin API.</p>}
                </div>
              </>
            )}
            {activePage === 'Analytics' && (
              <>
                <div className="admin-page-heading"><BarChart3 size={20} /><div><h2>Analytics</h2><p>Live metrics calculated from the application records.</p></div></div>
                <div className="analytics-grid">{applicationMetrics.map((metric) => <div className="analytics-card" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>
              </>
            )}
            {activePage === 'AI Processing' && (
              <>
                <div className="admin-page-heading"><Cpu size={20} /><div><h2>AI Processing</h2><p>Monitor the document-processing queue and completed cases.</p></div></div>
                <div className="analytics-grid"><div className="analytics-card"><span>Pending</span><strong>{applications.filter((app) => app.status === 'PENDING').length}</strong></div><div className="analytics-card"><span>Processing</span><strong>{applications.filter((app) => app.status === 'PROCESSING').length}</strong></div><div className="analytics-card"><span>Completed</span><strong>{applications.filter((app) => ['PROCESSED', 'APPROVED', 'REJECTED'].includes(app.status)).length}</strong></div></div>
              </>
            )}
            {activePage === 'Documents' && (
              <>
                <div className="admin-page-heading"><FileText size={20} /><div><h2>Documents</h2><p>Document records for the selected application.</p></div></div>
                <div className="admin-app-selector">{applications.slice(0, 12).map((app) => <button className={app.id === selectedId ? 'selected' : ''} key={app.id} onClick={() => setSelectedId(app.id)}>Loan {app.id.slice(0, 8)}</button>)}</div>
                <div className="document-overview-grid">{documents.map((document) => <div className="document-overview-card" key={document.id}><FileText size={18} /><strong>{document.document_type.replace('_', ' ')}</strong><span>{document.file_name || 'No file name'}</span><em>{document.status}</em></div>)}{!documents.length && <p className="empty">Select an application to view its uploaded documents.</p>}</div>
              </>
            )}
            {activePage === 'Audit Logs' && (
              <>
                <div className="admin-page-heading"><ClipboardList size={20} /><div><h2>Audit Logs</h2><p>Recent workflow activity from the current application records.</p></div></div>
                <div className="audit-list">{applications.slice(0, 8).map((app) => <div className="audit-row" key={app.id}><span className="audit-dot" /><div><strong>Loan {app.id.slice(0, 8)}</strong><p>Status updated to {STATUS_LABEL[app.status] || app.status}</p></div><time>{formatDate(app.updated_at || app.created_at)}</time></div>)}{!applications.length && <p className="empty">No audit activity yet.</p>}</div>
              </>
            )}
            {activePage === 'Settings' && (
              <>
                <div className="admin-page-heading"><Settings size={20} /><div><h2>Settings</h2><p>Workspace configuration and security status.</p></div></div>
                <div className="settings-grid"><div><span>Environment</span><strong>Development</strong></div><div><span>Authentication</span><strong>JWT + RBAC enabled</strong></div><div><span>Storage</span><strong>Supabase documents bucket</strong></div><div><span>AI decisions</span><strong>Human approval required</strong></div></div>
              </>
            )}
            {activePage === 'Notifications' && (
              <>
                <div className="admin-page-heading"><Bell size={20} /><div><h2>Notifications</h2><p>System and workflow notifications for this workspace.</p></div></div>
                <div className="notif-list admin-notification-list">{notifications.map((notification) => <div className="admin-notification-row" key={notification.id}><strong>{notification.title}</strong><span>{notification.body || 'No additional details'}</span><em>{notification.read ? 'Read' : 'Unread'}</em></div>)}{!notifications.length && <p className="empty">No notifications yet.</p>}</div>
              </>
            )}
          </section>
        )}

        <div className={`dashboard ${isAdmin && activePage !== 'Dashboard' ? 'dashboard-hidden' : ''}`}>
          <aside className="apps-panel">
            <div className="panel-title">
              <strong>Applications</strong>
              <span className="badge">{applications.length}</span>
            </div>
            <div className="apps-scroll">
              {applications.length === 0 && <p className="empty">No applications yet</p>}
              {applications.map((app) => (
                <button
                  key={app.id}
                  className={`app-card ${app.id === selectedId ? 'selected' : ''}`}
                  onClick={() => setSelectedId(app.id)}
                >
                  <div className="app-card-top">
                    <strong>Loan {app.id.slice(0, 8)}</strong>
                    <span className={statusClass(app.status)}>{STATUS_LABEL[app.status] || app.status}</span>
                  </div>
                  <div className="app-card-meta">
                    <span>₹{formatMoney(app.loan_amount)}</span>
                    <span>{formatDate(app.created_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="detail">
            {!selected ? (
              <div className="empty-state">
                <FileText size={40} />
                <p>Select an application to review</p>
              </div>
            ) : (
              <>
                {/* ---------------- DASHBOARD PAGE ---------------- */}
                {activePage === 'Dashboard' && <section className="d-section">
                  <div className="d-section-head">
                    <span className="d-section-num">01</span>
                    <div className="d-section-title">
                      <h2>Dashboard</h2>
                      <p>At-a-glance view of the selected loan application.</p>
                    </div>
                    <span className={statusClass(selected.status)}>{STATUS_LABEL[selected.status] || selected.status}</span>
                  </div>
                  <div className="overview-metrics">
                    {applicationMetrics.map((metric) => (
                      <div key={metric.label} className="overview-metric">
                        <span>{metric.label}</span>
                        <strong>{metric.value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="stat-grid">
                    {detailStats.map((s) => (
                      <div key={s.label} className="stat">
                        <label>{s.label}</label>
                        <strong>{s.value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="d-section-actions">
                    {busy && (
                      <span className="busy-hint">
                        <Loader2 className="spin" size={14} /> Working…
                      </span>
                    )}
                    <button className="btn-secondary" onClick={exportCSV}>
                      <Download size={15} /> Export audit CSV
                    </button>
                  </div>
                </section>}

                {/* ---------------- APPLICATION / DOCUMENT PAGE ---------------- */}
                {(activePage === 'Apply for Loan' || activePage === 'My Documents' || activePage === 'Upload Documents' || activePage === 'Document Requests' || activePage === 'Documents' || activePage === 'Applicant Details' || activePage === 'Loan Details') && <section className="d-section">
                  <div className="d-section-head">
                    <span className="d-section-num">02</span>
                    <div className="d-section-title">
                      <h2>New loan application + upload</h2>
                      <p>{selected.loan_purpose || 'General loan application'} · Add the documents that support this case.</p>
                    </div>
                    <span className="badge">{documents.length}</span>
                  </div>

                  {!isReviewer && (
                    <div className="upload-block">
                      <div
                        className={`dropzone ${dragging ? 'dragging' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault()
                          setDragging(true)
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        onClick={() => inputRef.current?.click()}
                      >
                        <input
                          ref={inputRef}
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg"
                          onChange={onFileChange}
                        />
                        <Upload size={26} />
                        <p>
                          Drag files here or <strong>click to browse</strong>
                        </p>
                        <small>PDF, PNG, JPG</small>
                        <select
                          value={docType}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setDocType(e.target.value)}
                        >
                          {DOCUMENT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t.replace('_', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                      {files.length > 0 && (
                        <div className="file-list">
                          {files.map((file, i) => (
                            <div key={`${file.name}-${i}`} className="file-item">
                              <CheckCircle2 size={14} />
                              <span>{file.name}</span>
                              <button onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <button className="btn-black file-upload-btn" onClick={uploadAll}>
                            <Upload size={15} /> Upload {files.length} file{files.length > 1 ? 's' : ''}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="doc-list">
                    {documents.length === 0 && <p className="empty">No documents uploaded yet</p>}
                    {documents.map((doc) => (
                      <div key={doc.id} className={`doc-item ${doc.status.toLowerCase()}`}>
                        <div className="doc-icon">
                          {doc.status === 'VALID' ? <CheckCircle2 size={16} /> : <FileText size={16} />}
                        </div>
                        <div className="doc-info">
                          <strong>{doc.file_name || doc.document_type}</strong>
                          <small>
                            {doc.document_type.replace('_', ' ')} · {doc.status} ·{' '}
                            {doc.size_bytes ? `${(doc.size_bytes / 1024).toFixed(0)} KB` : '—'}
                          </small>
                        </div>
                        <span className={statusClass(doc.status)}>{doc.status}</span>
                      </div>
                    ))}
                  </div>
                </section>}

                {/* ---------------- AI PROCESSING PAGE ---------------- */}
                {(activePage === 'AI Processing' || activePage === 'AI Document Analysis' || activePage === 'AI Processing Summary') && <section className="d-section ai-processing-section">
                  <div className="d-section-head">
                    <span className="d-section-num">03</span>
                    <div className="d-section-title">
                      <h2>AI document processing</h2>
                      <p>Process the uploaded files and prepare them for extraction.</p>
                    </div>
                    <ScanSearch size={18} className="section-icon" />
                  </div>
                  <div className="processing-layout">
                    <div className="processing-copy">
                      <strong>{documents.length ? `${documents.length} document${documents.length === 1 ? '' : 's'} ready` : 'Waiting for documents'}</strong>
                      <p>
                        LoanAI reads the selected files, checks their structure and prepares the evidence for the
                        next review stage.
                      </p>
                    </div>
                    {isReviewer && selected.status !== 'APPROVED' && selected.status !== 'REJECTED' && (
                      <button className="btn-green" onClick={runProcessing} disabled={!documents.length || busy}>
                        {selected.status === 'PROCESSING' ? <Loader2 className="spin" size={15} /> : <ScanSearch size={15} />}
                        {selected.status === 'PROCESSING' ? 'Processing…' : 'Start AI processing'}
                      </button>
                    )}
                  </div>
                </section>}

                {/* ------------- EXTRACTION / VALIDATION PAGE ------------- */}
                {(activePage === 'AI Document Analysis' || activePage === 'Missing Documents' || activePage === 'Inconsistency Detection') && <section className="d-section">
                  <div className="d-section-head">
                    <span className="d-section-num">04</span>
                    <div className="d-section-title">
                      <h2>Extraction + inconsistency detection</h2>
                      <p>Figures pulled from documents and cross-checked against the dataset.</p>
                    </div>
                    {extractionReady && summary && summary.confidence != null && (
                      <div className="analysis-badges">
                        <span className={`confidence-pill ${summary.confidence >= 0.7 ? 'good' : 'warn'}`}>
                          {Math.round(summary.confidence * 100)}% match
                        </span>
                        {summary.risk_level && <span className={`risk-pill ${summary.risk_level.toLowerCase()}`}>{summary.risk_level} risk</span>}
                      </div>
                    )}
                  </div>

                  {!extractionReady ? (
                    <p className="empty">
                      <ScanSearch size={18} /> Run verification to extract figures and check them.
                    </p>
                  ) : (
                    <>
                      {extractedRows.length > 0 && (
                        <div className="extract-rows">
                          {extractedRows.map(({ doc, fields }) => (
                            <div key={doc.id} className="extract-row">
                              <div className="extract-row-head">
                                <strong>{doc.document_type.replace('_', ' ')}</strong>
                                <span className={statusClass(doc.status)}>{doc.status}</span>
                              </div>
                              <div className="extract-fields">
                                {Object.keys(fields).length === 0 && <span className="empty">No fields extracted</span>}
                                {Object.entries(fields).map(([key, value]) => (
                                  <div key={key} className="field-chip">
                                    <span>{fieldLabel(key)}</span>
                                    <strong>{prettyValue(key, value)}</strong>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="checks-grid">
                        <div className="check-block">
                          <span className="check-head">
                            <AlertTriangle size={14} /> Consistency check
                          </span>
                          {!hasFlags ? (
                            <p className="ai-clean">
                              <CheckCircle2 size={14} /> No inconsistencies found
                            </p>
                          ) : (
                            <ul className="ai-issues">
                              {summary.inconsistencies.map((inc, i) => (
                                <li key={i}>
                                  <AlertTriangle size={13} /> {inc}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="check-block">
                          <span className="check-head">
                            <FileText size={14} /> Required documents
                          </span>
                          {!hasMissing ? (
                            <p className="ai-clean">
                              <CheckCircle2 size={14} /> All required documents present
                            </p>
                          ) : (
                            <ul className="ai-issues">
                              {summary.missing_documents.map((m, i) => (
                                <li key={i}>
                                  <AlertTriangle size={13} /> Missing: {String(m).replace(/_/g, ' ')}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </section>}

                {/* ---------------- AI SUMMARY PAGE ---------------- */}
                {activePage === 'AI Processing Summary' && <section className="d-section summary-section">
                  <div className="d-section-head">
                    <span className="d-section-num">05</span>
                    <div className="d-section-title">
                      <h2>AI loan summary</h2>
                      <p>A concise readout of the evidence gathered so far.</p>
                    </div>
                    <span className="ai-label">AI generated</span>
                  </div>
                  <div className="summary-content">
                    <div className="summary-mark">✦</div>
                    <p>{summary?.summary || 'Run AI document processing to generate a loan summary.'}</p>
                  </div>
                </section>}

                {/* --------------- HUMAN REVIEW PAGE --------------- */}
                {activePage === 'Human Review' && <section className="d-section review-panel">
                    <div className="d-section-head">
                      <span className="d-section-num">06</span>
                      <div className="d-section-title">
                        <h2>Human review</h2>
                        <p>A person reviews the flags and makes the final call.</p>
                      </div>
                      <ShieldCheck size={18} className="review-icon" />
                    </div>

                    {!isReviewer ? (
                      <div className="review-locked">
                        <ShieldCheck size={18} />
                        <p>This application will appear here when it is ready for reviewer approval.</p>
                      </div>
                    ) : <>
                      {(selected.status === 'PENDING' || !selected.assigned_reviewer_id) &&
                      selected.status !== 'APPROVED' &&
                      selected.status !== 'REJECTED' && (
                        <div className="action-row">
                          <button
                            className="btn-secondary"
                            onClick={() => run(() => applicationApi.claim(selected.id), 'Application claimed')}
                          >
                            <ShieldCheck size={15} /> Claim application
                          </button>
                        </div>
                      )}
                    {isAdmin && (
                      <div className="assign-row">
                        <label htmlFor="assignTo">Assign reviewer</label>
                        <select id="assignTo" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                          <option value="">Choose a reviewer…</option>
                          {reviewers.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.full_name} · {r.email}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn-black"
                          disabled={!assignTo}
                          onClick={() => {
                            const target = assignTo
                            setAssignTo('')
                            return run(() => applicationApi.assign(selected.id, target), 'Reviewer assigned')
                          }}
                        >
                          Assign
                        </button>
                      </div>
                    )}
                    {selected.status !== 'APPROVED' && selected.status !== 'REJECTED' && (
                      <>
                        <textarea
                          className="notes-input"
                          placeholder="Review notes (optional)"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                        />
                        <div className="decision-row">
                          <button className="btn-success" onClick={() => reviewDecision('APPROVED')}>
                            <CheckCircle2 size={15} /> Approve
                          </button>
                          <button className="btn-warn" onClick={() => reviewDecision('NEEDS_MORE_INFO')}>
                            <Mail size={15} /> Request documents
                          </button>
                          <button className="btn-danger" onClick={() => reviewDecision('REJECTED')}>
                            <X size={15} /> Reject
                          </button>
                        </div>
                      </>
                    )}
                    {selected.assigned_reviewer_id && (
                      <p className="assign-hint">Assigned to reviewer {selected.assigned_reviewer_id.slice(0, 8)} …</p>
                    )}
                    </>}
                  </section>}

                {![
                  'Dashboard',
                  'Apply for Loan',
                  'My Documents',
                  'Upload Documents',
                  'Document Requests',
                  'Application Status',
                  'Applicant Details',
                  'Loan Details',
                  'Documents',
                  'AI Processing',
                  'AI Document Analysis',
                  'Missing Documents',
                  'Inconsistency Detection',
                  'AI Processing Summary',
                  'Human Review',
                  'Notifications',
                  'Profile / Settings',
                  'All Applicants',
                  'Loan Reviewers',
                  'All Applications',
                  'Users',
                  'Analytics',
                  'Audit Logs',
                  'Settings',
                ].includes(activePage) && (
                  <div className="page-empty">
                    <div className="page-empty-icon"><ShieldCheck size={22} /></div>
                    <h2>{activePage}</h2>
                    <p>This workspace page is ready for {roleLabel.toLowerCase()} controls and records.</p>
                  </div>
                )}

                {activePage === 'Dashboard' && !isReviewer && selected.status === 'NEEDS_MORE_INFO' && (
                  <div className="alert-soft">
                    <AlertTriangle size={18} />
                    <p>
                      Some documents are still missing. Upload the requested files and the reviewer will take another
                      look.
                    </p>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {newAppOpen && (
          <div className="modal-overlay" onClick={() => setNewAppOpen(false)}>
            <form className="modal-card" onSubmit={createApplication} onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <strong>New loan application</strong>
                <button type="button" onClick={() => setNewAppOpen(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="field">
                <label htmlFor="loanAmount">Loan amount (₹)</label>
                <input
                  id="loanAmount"
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  placeholder="2500000"
                />
              </div>
              <div className="field">
                <label htmlFor="loanPurpose">Purpose</label>
                <input
                  id="loanPurpose"
                  value={loanPurpose}
                  onChange={(e) => setLoanPurpose(e.target.value)}
                  placeholder="Home loan"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setNewAppOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-black">
                  <ArrowRight size={15} /> Create
                </button>
              </div>
            </form>
          </div>
        )}
          </div>
        </div>
      </main>
      {element}
    </div>
  )
}

/* ========================================================================== */
/*  APP                                                                       */
/* ========================================================================== */

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [booting, setBooting] = useState(true)
  const [showLanding, setShowLanding] = useState(true)

  useEffect(() => {
    if (!hasSession()) {
      setBooting(false)
      return
    }
    authApi
      .me()
      .then((u) => {
        setUser(u)
        setShowLanding(false)
      })
      .catch(() => clearSession())
      .finally(() => setBooting(false))
  }, [])

  if (booting) {
    return (
      <div className="boot-screen">
        <Loader2 className="spin" size={26} />
        <p>Loading LoanAI…</p>
      </div>
    )
  }

  if (!user) {
    return showLanding ? (
      <LandingPage onGetStarted={() => setShowLanding(false)} />
    ) : (
      <LoginScreen onAuthed={setUser} onBack={() => setShowLanding(true)} />
    )
  }

  return (
    <Dashboard
      user={user}
      onLogout={() => {
        clearSession()
        setUser(null)
        setShowLanding(true)
      }}
    />
  )
}

export default App