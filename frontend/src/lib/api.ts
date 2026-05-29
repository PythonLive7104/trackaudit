import type {
  AuthTokens, User, Workspace, WorkspaceMember, Invitation,
  IntegrationStatus, GoogleAdsConnection, DiscoveredAccount, MonitoredAccount,
  SlackIntegration, AuditRun, AuditCheck, AuditSchedule, HealthScoreEntry,
  Alert, AlertStats, AlertStatus, NotificationPreference, AccountAlertOverride,
  Report, WhiteLabelConfig, Plan, Subscription, Invoice, PaginatedResponse,
} from './types';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ── Token storage ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'ta_access';
const REFRESH_KEY = 'ta_refresh';

export const tokenStore = {
  getAccess: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem('ta_workspace');
  },
};

// ── Core fetch wrapper ────────────────────────────────────────────────────────

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStore.getRefresh();
  if (!refresh) throw new Error('No refresh token');
  const res = await fetch(`${BASE}/api/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    tokenStore.clear();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  const data = await res.json();
  tokenStore.set(data.access, refresh);
  return data.access;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = tokenStore.getAccess();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
    }
    const newToken = await refreshPromise;
    return request<T>(path, {
      ...options,
      headers: { ...headers, Authorization: `Bearer ${newToken}` },
    }, false);
  }

  if (res.status === 204) return undefined as T;
  const json = await res.json();
  if (!res.ok) throw { status: res.status, data: json };
  return json as T;
}

const get  = <T>(path: string) => request<T>(path, { method: 'GET' });
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body != null ? JSON.stringify(body) : undefined });
const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: body != null ? JSON.stringify(body) : undefined });
const del  = (path: string) => request<void>(path, { method: 'DELETE' });

// ── API modules ───────────────────────────────────────────────────────────────

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    register: (data: { email: string; password: string; full_name: string; workspace_name: string }) =>
      post<AuthTokens>('/api/auth/register/', data),
    login: (email: string, password: string) =>
      post<AuthTokens>('/api/auth/login/', { email, password }),
    logout: (refresh: string) => post<void>('/api/auth/logout/', { refresh }),
    google: (code: string, workspace_name?: string) =>
      post<AuthTokens & { created: boolean }>('/api/auth/google/', { code, workspace_name }),
    me: () => get<User>('/api/auth/me/'),
    updateMe: (data: Partial<User>) => patch<User>('/api/auth/me/', data),
    requestPasswordReset: (email: string) =>
      post<{ detail: string }>('/api/auth/password-reset/', { email }),
    confirmPasswordReset: (token: string, password: string) =>
      post<{ detail: string }>('/api/auth/password-reset/confirm/', { token, password }),
  },

  // ── Workspaces ────────────────────────────────────────────────────────────
  workspaces: {
    list: () => get<Workspace[]>('/api/auth/workspaces/'),
    get: (id: string) => get<Workspace>(`/api/auth/workspaces/${id}/`),
    create: (data: { name: string }) => post<Workspace>('/api/auth/workspaces/', data),
    update: (id: string, data: Partial<Workspace>) =>
      patch<Workspace>(`/api/auth/workspaces/${id}/`, data),
    members: (id: string) => get<WorkspaceMember[]>(`/api/auth/workspaces/${id}/members/`),
    updateMember: (wsId: string, memberId: number, role: string) =>
      patch<WorkspaceMember>(`/api/auth/workspaces/${wsId}/members/${memberId}/`, { role }),
    removeMember: (wsId: string, memberId: number) =>
      del(`/api/auth/workspaces/${wsId}/members/${memberId}/remove/`),
    invite: (wsId: string, data: { email: string; role: string }) =>
      post<Invitation>(`/api/auth/workspaces/${wsId}/invite/`, data),
    invitations: (wsId: string) => get<Invitation[]>(`/api/auth/workspaces/${wsId}/invitations/`),
  },

  // ── Integrations ──────────────────────────────────────────────────────────
  integrations: {
    status: (wsId: string) => get<IntegrationStatus>(`/api/workspaces/${wsId}/integrations/`),
    googleAds: {
      authUrl: (wsId: string) =>
        get<{ auth_url: string }>(`/api/workspaces/${wsId}/integrations/google-ads/auth/`),
      callback: (wsId: string, code: string) =>
        post<GoogleAdsConnection>(`/api/workspaces/${wsId}/integrations/google-ads/callback/`, { code }),
      connections: (wsId: string) =>
        get<GoogleAdsConnection[]>(`/api/workspaces/${wsId}/integrations/google-ads/connections/`),
      disconnect: (wsId: string, connId: string) =>
        del(`/api/workspaces/${wsId}/integrations/google-ads/connections/${connId}/`),
      reauthorize: (wsId: string, connId: string) =>
        post<{ auth_url: string; connection_id: string }>(
          `/api/workspaces/${wsId}/integrations/google-ads/connections/${connId}/reauthorize/`
        ),
      discover: (wsId: string, connId: string) =>
        get<DiscoveredAccount[]>(
          `/api/workspaces/${wsId}/integrations/google-ads/connections/${connId}/discover/`
        ),
    },
    slack: {
      get: (wsId: string) => get<SlackIntegration>(`/api/workspaces/${wsId}/integrations/slack/`),
      callback: (wsId: string, code: string) =>
        post<SlackIntegration>(`/api/workspaces/${wsId}/integrations/slack/callback/`, { code }),
      disconnect: (wsId: string) =>
        del(`/api/workspaces/${wsId}/integrations/slack/`),
    },
  },

  // ── Monitored Accounts ────────────────────────────────────────────────────
  accounts: {
    list: (wsId: string) =>
      get<PaginatedResponse<MonitoredAccount>>(`/api/workspaces/${wsId}/accounts/`),
    create: (wsId: string, data: { connection_id: string; customer_ids: string[] }) =>
      post<MonitoredAccount[]>(`/api/workspaces/${wsId}/accounts/`, data),
    get: (wsId: string, accountId: string) =>
      get<MonitoredAccount>(`/api/workspaces/${wsId}/accounts/${accountId}/`),
    update: (wsId: string, accountId: string, data: Partial<MonitoredAccount>) =>
      patch<MonitoredAccount>(`/api/workspaces/${wsId}/accounts/${accountId}/`, data),
    delete: (wsId: string, accountId: string) =>
      del(`/api/workspaces/${wsId}/accounts/${accountId}/`),
  },

  // ── Audits ────────────────────────────────────────────────────────────────
  audits: {
    list: (wsId: string, params?: { account_id?: string }) => {
      const qs = params?.account_id ? `?account_id=${params.account_id}` : '';
      return get<PaginatedResponse<AuditRun>>(`/api/workspaces/${wsId}/audits/${qs}`);
    },
    run: (wsId: string, accountId: string) =>
      post<AuditRun>(`/api/workspaces/${wsId}/audits/trigger/`, { account_id: accountId }),
    get: (wsId: string, runId: string) =>
      get<AuditRun>(`/api/workspaces/${wsId}/audits/${runId}/`),
    checks: (wsId: string, runId: string) =>
      get<AuditCheck[]>(`/api/workspaces/${wsId}/audits/${runId}/checks/`),
    healthHistory: (wsId: string, accountId: string) =>
      get<HealthScoreEntry[]>(`/api/workspaces/${wsId}/accounts/${accountId}/health-history/`),
    schedules: {
      list: (wsId: string) =>
        get<AuditSchedule[]>(`/api/workspaces/${wsId}/schedules/`),
      get: (wsId: string, id: number) =>
        get<AuditSchedule>(`/api/workspaces/${wsId}/schedules/${id}/`),
      update: (wsId: string, id: number, data: Partial<AuditSchedule>) =>
        patch<AuditSchedule>(`/api/workspaces/${wsId}/schedules/${id}/`, data),
    },
  },

  // ── Alerts ────────────────────────────────────────────────────────────────
  alerts: {
    list: (wsId: string, params?: { severity?: string; status?: string; account_id?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return get<PaginatedResponse<Alert>>(`/api/workspaces/${wsId}/alerts/${qs ? `?${qs}` : ''}`);
    },
    stats: (wsId: string) => get<AlertStats>(`/api/workspaces/${wsId}/alerts/stats/`),
    get: (wsId: string, alertId: string) =>
      get<Alert>(`/api/workspaces/${wsId}/alerts/${alertId}/`),
    snooze: (wsId: string, alertId: string, data: { duration: string; until?: string }) =>
      post<Alert>(`/api/workspaces/${wsId}/alerts/${alertId}/snooze/`, data),
    resolve: (wsId: string, alertId: string, note?: string) =>
      post<Alert>(`/api/workspaces/${wsId}/alerts/${alertId}/resolve/`, { note }),
    preferences: (wsId: string) =>
      get<NotificationPreference>(`/api/workspaces/${wsId}/notifications/`),
    updatePreferences: (wsId: string, data: Partial<NotificationPreference>) =>
      patch<NotificationPreference>(`/api/workspaces/${wsId}/notifications/`, data),
    overrides: {
      list: (wsId: string) =>
        get<AccountAlertOverride[]>(`/api/workspaces/${wsId}/alert-overrides/`),
      get: (wsId: string, accountId: string) =>
        get<AccountAlertOverride>(`/api/workspaces/${wsId}/accounts/${accountId}/alert-override/`),
      update: (wsId: string, accountId: string, data: Partial<AccountAlertOverride>) =>
        patch<AccountAlertOverride>(
          `/api/workspaces/${wsId}/accounts/${accountId}/alert-override/`, data
        ),
      delete: (wsId: string, accountId: string) =>
        del(`/api/workspaces/${wsId}/accounts/${accountId}/alert-override/`),
    },
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    list: (wsId: string, accountId?: string) => {
      const qs = accountId ? `?account_id=${accountId}` : '';
      return get<PaginatedResponse<Report>>(`/api/workspaces/${wsId}/reports/${qs}`);
    },
    get: (wsId: string, reportId: string) =>
      get<Report>(`/api/workspaces/${wsId}/reports/${reportId}/`),
    generate: (wsId: string, data: { account_id: string; audit_run_id?: string; share_link_expires_days?: number }) =>
      post<Report>(`/api/workspaces/${wsId}/reports/generate/`, data),
    share: (token: string) =>
      get<Report>(`/api/reports/share/${token}/`),
    whiteLabel: (wsId: string) =>
      get<WhiteLabelConfig>(`/api/workspaces/${wsId}/white-label/`),
    updateWhiteLabel: (wsId: string, data: Partial<WhiteLabelConfig>) =>
      patch<WhiteLabelConfig>(`/api/workspaces/${wsId}/white-label/`, data),
  },

  // ── Billing ───────────────────────────────────────────────────────────────
  billing: {
    plans: () => get<Plan[]>('/api/billing/plans/'),
    subscription: (wsId: string) =>
      get<Subscription>(`/api/billing/workspaces/${wsId}/subscription/`),
    invoices: (wsId: string) =>
      get<PaginatedResponse<Invoice>>(`/api/billing/workspaces/${wsId}/invoices/`),
    createCheckout: (wsId: string, data: { dodo_product_id: string; return_url: string }) =>
      post<{ checkout_url: string }>(`/api/billing/workspaces/${wsId}/checkout/`, data),
  },
};
