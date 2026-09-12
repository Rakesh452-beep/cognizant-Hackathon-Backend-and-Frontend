const API = '/api/v1'

const TOKEN_KEY = 'lda_token'
const REFRESH_KEY = 'lda_refresh'

export type Role = 'applicant' | 'reviewer' | 'admin'

export interface User {
  id: string
  email: string
  full_name: string
  role: Role
}

export interface AuthResponse {
  access_token: string
  refresh_token?: string | null
  token_type: string
  expires_at?: number | null
}

export interface Application {
  id: string
  applicant_id: string
  assigned_reviewer_id?: string | null
  status: string
  loan_amount?: number | null
  loan_purpose?: string | null
  submitted_at?: string | null
  reviewed_at?: string | null
  review_notes?: string | null
  no_of_dependents?: number | null
  education?: string | null
  self_employed?: boolean | null
  income_annum?: number | null
  loan_term?: number | null
  cibil_score?: number | null
  residential_assets_value?: number | null
  commercial_assets_value?: number | null
  luxury_assets_value?: number | null
  bank_asset_value?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export interface ApplicationCreate {
  loan_amount?: number | null
  loan_purpose?: string | null
}

export interface Document {
  id: string
  application_id: string
  document_type: string
  file_name?: string | null
  mime_type?: string | null
  size_bytes?: number | null
  status: string
  uploaded_by?: string | null
  created_at?: string | null
}

export interface Summary {
  application_id: string
  status: string
  summary_ready: boolean
  summary?: string | null
  inconsistencies: string[]
  missing_documents: string[]
  confidence?: number | null
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | null
  extracted_fields?: Record<string, Record<string, string | number | null>>
}

export interface Notification {
  id: string
  type: string
  title: string
  body?: string | null
  metadata: Record<string, unknown>
  read: boolean
  created_at?: string | null
}

export interface ApiError {
  status?: number
  message: string
}

class HttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setSession(auth: AuthResponse): void {
  localStorage.setItem(TOKEN_KEY, auth.access_token)
  if (auth.refresh_token) localStorage.setItem(REFRESH_KEY, auth.refresh_token)
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export function hasSession(): boolean {
  return Boolean(getToken())
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API}${path}`, { ...options, headers })
  if (res.status === 204) return undefined as T

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new HttpError((body as ApiError).message || `Request failed (${res.status})`, res.status)
  }
  return body as T
}

async function upload<T>(path: string, form: FormData): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API}${path}`, { method: 'POST', headers, body: form })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new HttpError((body as ApiError).message || `Request failed (${res.status})`, res.status)
  }
  return body as T
}

export const authApi = {
  signup: (fullName: string, email: string, password: string) =>
    request<User>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, email, password }),
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>('/auth/me'),
}

export const applicationApi = {
  list: () => request<Application[]>('/applications'),
  create: (payload: ApplicationCreate) =>
    request<Application>('/applications', { method: 'POST', body: JSON.stringify(payload) }),
  get: (id: string) => request<Application>(`/applications/${id}`),
  documents: (id: string) => request<Document[]>(`/applications/${id}/documents`),
  uploadDocument: (id: string, file: File, documentType: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('document_type', documentType)
    return upload<Document>(`/applications/${id}/documents`, form)
  },
  summary: (id: string) => request<Summary>(`/applications/${id}/summary`),
  process: (id: string) =>
    request<Application>(`/applications/${id}/process`, { method: 'POST' }),
  claim: (id: string) => request<Application>(`/applications/${id}/claim`, { method: 'POST' }),
  assign: (id: string, reviewerId: string) =>
    request<Application>(`/applications/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ reviewer_id: reviewerId }),
    }),
  review: (id: string, decision: string, notes: string) =>
    request<Application>(`/applications/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes }),
    }),
}

export const notificationApi = {
  list: () => request<Notification[]>('/notifications'),
  markAllRead: () => request<void>('/notifications/read-all', { method: 'POST' }),
  markRead: (id: string) =>
    request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),
}

export const adminApi = {
  users: (role?: string) =>
    request<{ users: User[]; total: number }>(
      `/admin/users${role ? `?role=${role}` : ''}`
    ),
  updateRole: (userId: string, role: Role) =>
    request<{ users: User[]; total: number }>(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ user_id: userId, role }),
    }),
}

export const DOCUMENT_TYPES = ['PAYSLIP', 'BANK_STATEMENT', 'TAX_RETURN', 'KYC', 'OTHER'] as const

export const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  PROCESSED: 'Processed',
  NEEDS_MORE_INFO: 'Needs more info',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}