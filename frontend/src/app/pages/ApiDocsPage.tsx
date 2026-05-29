import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, ChevronRight, Book, Copy, Check } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Endpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  curl: string;
  response: string;
}

interface EndpointGroup {
  id: string;
  label: string;
  endpoints: Endpoint[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const GROUPS: EndpointGroup[] = [
  {
    id: 'accounts',
    label: 'Accounts',
    endpoints: [
      {
        method: 'GET',
        path: '/api/workspaces/{id}/accounts/',
        description: 'List all monitored Google Ads accounts for a workspace.',
        curl: `curl -X GET https://app.trackaudit.io/api/workspaces/ws_123/accounts/ \\
  -H "Authorization: Bearer <your_access_token>"`,
        response: `{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "acc_abc",
      "account_name": "Acme Corp",
      "google_ads_customer_id": "123-456-7890",
      "status": "active",
      "latest_health_score": 87,
      "open_critical_count": 0
    }
  ]
}`,
      },
    ],
  },
  {
    id: 'alerts',
    label: 'Alerts',
    endpoints: [
      {
        method: 'GET',
        path: '/api/workspaces/{id}/alerts/',
        description: 'List all open alerts for a workspace, ordered by severity.',
        curl: `curl -X GET https://app.trackaudit.io/api/workspaces/ws_123/alerts/ \\
  -H "Authorization: Bearer <your_access_token>"`,
        response: `{
  "count": 1,
  "results": [
    {
      "id": "alert_xyz",
      "severity": "critical",
      "message": "Conversion tag missing on checkout page",
      "created_at": "2026-05-20T10:32:00Z",
      "resolved": false
    }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/api/workspaces/{id}/alerts/{id}/resolve/',
        description: 'Mark an alert as resolved.',
        curl: `curl -X POST https://app.trackaudit.io/api/workspaces/ws_123/alerts/alert_xyz/resolve/ \\
  -H "Authorization: Bearer <your_access_token>"`,
        response: `{
  "id": "alert_xyz",
  "resolved": true,
  "resolved_at": "2026-05-27T09:00:00Z"
}`,
      },
    ],
  },
  {
    id: 'audits',
    label: 'Audits',
    endpoints: [
      {
        method: 'POST',
        path: '/api/workspaces/{id}/audit-runs/',
        description: 'Trigger a new audit run for a monitored account.',
        curl: `curl -X POST https://app.trackaudit.io/api/workspaces/ws_123/audit-runs/ \\
  -H "Authorization: Bearer <your_access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{"account": "acc_abc"}'`,
        response: `{
  "id": "run_001",
  "account": "acc_abc",
  "status": "running",
  "started_at": "2026-05-27T09:00:00Z",
  "completed_at": null
}`,
      },
      {
        method: 'GET',
        path: '/api/workspaces/{id}/audit-runs/{id}/checks/',
        description: 'Retrieve all check results for a completed audit run.',
        curl: `curl -X GET https://app.trackaudit.io/api/workspaces/ws_123/audit-runs/run_001/checks/ \\
  -H "Authorization: Bearer <your_access_token>"`,
        response: `{
  "count": 50,
  "results": [
    {
      "id": "chk_1",
      "name": "Conversion tag present",
      "status": "pass",
      "severity": "critical",
      "description": "Global site tag detected on all pages."
    },
    {
      "id": "chk_2",
      "name": "Consent Mode V2 configured",
      "status": "fail",
      "severity": "warning",
      "description": "Default consent state not set before tag fires."
    }
  ]
}`,
      },
    ],
  },
  {
    id: 'authentication',
    label: 'Authentication',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/login/',
        description: 'Authenticate with email and password. Returns a short-lived access token (60 min) and a refresh token.',
        curl: `curl -X POST https://app.trackaudit.io/api/auth/login/ \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "you@agency.com",
    "password": "your_password"
  }'`,
        response: `{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_abc",
    "email": "you@agency.com",
    "full_name": "Jane Smith",
    "role": "admin"
  }
}`,
      },
      {
        method: 'GET',
        path: '/api/auth/me/',
        description: 'Return the profile of the currently authenticated user.',
        curl: `curl -X GET https://app.trackaudit.io/api/auth/me/ \\
  -H "Authorization: Bearer <your_access_token>"`,
        response: `{
  "id": "usr_abc",
  "email": "you@agency.com",
  "full_name": "Jane Smith",
  "role": "admin",
  "avatar_url": null
}`,
      },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    endpoints: [
      {
        method: 'GET',
        path: '/api/billing/plans/',
        description: 'List all available subscription plans and their features.',
        curl: `curl -X GET https://app.trackaudit.io/api/billing/plans/ \\
  -H "Authorization: Bearer <your_access_token>"`,
        response: `{
  "results": [
    {
      "id": "plan_starter",
      "name": "Starter",
      "price_monthly": 49,
      "price_annual": 39,
      "account_limit": 5,
      "features": ["50 checks", "Email alerts", "PDF reports"]
    },
    {
      "id": "plan_agency",
      "name": "Agency",
      "price_monthly": 149,
      "price_annual": 119,
      "account_limit": 25,
      "features": ["50 checks", "Slack alerts", "White-label reports", "API access"]
    }
  ]
}`,
      },
    ],
  },
  {
    id: 'integrations',
    label: 'Integrations',
    endpoints: [
      {
        method: 'GET',
        path: '/api/workspaces/{id}/integrations/',
        description: 'List all third-party integrations connected to the workspace.',
        curl: `curl -X GET https://app.trackaudit.io/api/workspaces/ws_123/integrations/ \\
  -H "Authorization: Bearer <your_access_token>"`,
        response: `{
  "results": [
    {
      "id": "int_slack",
      "type": "slack",
      "connected": true,
      "channel": "#tracking-alerts"
    }
  ]
}`,
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    endpoints: [
      {
        method: 'POST',
        path: '/api/workspaces/{id}/reports/generate/',
        description: 'Generate a white-label PDF report for an audit run.',
        curl: `curl -X POST https://app.trackaudit.io/api/workspaces/ws_123/reports/generate/ \\
  -H "Authorization: Bearer <your_access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{"audit_run": "run_001", "include_branding": true}'`,
        response: `{
  "id": "rpt_001",
  "status": "generating",
  "share_token": "tok_abc123",
  "pdf_url": null,
  "created_at": "2026-05-27T09:01:00Z"
}`,
      },
      {
        method: 'GET',
        path: '/api/reports/share/{token}/',
        description: 'Public endpoint to view a shared report by its token. No authentication required.',
        curl: `curl -X GET https://app.trackaudit.io/api/reports/share/tok_abc123/`,
        response: `{
  "id": "rpt_001",
  "account_name": "Acme Corp",
  "generated_at": "2026-05-27T09:02:00Z",
  "health_score": 87,
  "checks_passed": 44,
  "checks_failed": 6,
  "pdf_url": "https://cdn.trackaudit.io/reports/rpt_001.pdf"
}`,
      },
    ],
  },
  {
    id: 'workspaces',
    label: 'Workspaces',
    endpoints: [
      {
        method: 'GET',
        path: '/api/auth/workspaces/',
        description: 'List all workspaces the authenticated user belongs to.',
        curl: `curl -X GET https://app.trackaudit.io/api/auth/workspaces/ \\
  -H "Authorization: Bearer <your_access_token>"`,
        response: `{
  "count": 1,
  "results": [
    {
      "id": "ws_123",
      "name": "My Agency",
      "plan": "agency",
      "account_count": 12,
      "created_at": "2025-01-15T08:00:00Z"
    }
  ]
}`,
      },
    ],
  },
];

// ─── Method badge ─────────────────────────────────────────────────────────────

const METHOD_CLASSES: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  POST: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  PATCH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded border font-mono tracking-wide ${METHOD_CLASSES[method] ?? ''}`}
    >
      {method}
    </span>
  );
}

// ─── Syntax-highlighted code block ───────────────────────────────────────────

function highlightJson(raw: string): React.ReactNode {
  const lines = raw.split('\n');
  return lines.map((line, li) => {
    // tokenise: string values, keys, numbers, booleans/null
    const parts: React.ReactNode[] = [];
    let rest = line;
    let key = 0;

    while (rest.length) {
      // quoted key (before colon)
      const keyMatch = rest.match(/^("(?:[^"\\]|\\.)*"\s*:)/);
      if (keyMatch) {
        parts.push(<span key={key++} className="text-sky-300">{keyMatch[1]}</span>);
        rest = rest.slice(keyMatch[1].length);
        continue;
      }
      // quoted string value
      const strMatch = rest.match(/^("(?:[^"\\]|\\.)*")/);
      if (strMatch) {
        parts.push(<span key={key++} className="text-emerald-300">{strMatch[1]}</span>);
        rest = rest.slice(strMatch[1].length);
        continue;
      }
      // number
      const numMatch = rest.match(/^(-?\d+(?:\.\d+)?)/);
      if (numMatch) {
        parts.push(<span key={key++} className="text-amber-300">{numMatch[1]}</span>);
        rest = rest.slice(numMatch[1].length);
        continue;
      }
      // true/false/null
      const kwMatch = rest.match(/^(true|false|null)/);
      if (kwMatch) {
        parts.push(<span key={key++} className="text-violet-300">{kwMatch[1]}</span>);
        rest = rest.slice(kwMatch[1].length);
        continue;
      }
      // punctuation / whitespace — consume one char
      parts.push(<span key={key++} className="text-slate-400">{rest[0]}</span>);
      rest = rest.slice(1);
    }

    return (
      <span key={li} className="block">
        {parts}
        {'\n'}
      </span>
    );
  });
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: 'bash' | 'json' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative group rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors opacity-0 group-hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>
      <pre className="p-4 text-xs leading-relaxed overflow-x-auto">
        <code>
          {language === 'json' ? highlightJson(code) : (
            <span className="text-slate-200">{code}</span>
          )}
        </code>
      </pre>
    </div>
  );
}

// ─── Collapsible endpoint row ─────────────────────────────────────────────────

function EndpointRow({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'curl' | 'python'>('curl');

  const pythonExample = `import requests

response = requests.${endpoint.method.toLowerCase()}(
    "https://app.trackaudit.io${endpoint.path.replace('{id}', 'ws_123')}",
    headers={"Authorization": "Bearer <your_access_token>"},
)
print(response.json())`;

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors text-left"
      >
        <MethodBadge method={endpoint.method} />
        <code className="text-sm font-mono text-foreground flex-1">{endpoint.path}</code>
        <span className="text-sm text-muted-foreground hidden sm:block mr-2">{endpoint.description}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border bg-muted/20 space-y-4">
          <p className="text-sm text-muted-foreground pt-4">{endpoint.description}</p>

          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b border-border">
            {(['curl', 'python'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px capitalize ${
                  tab === t
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'curl' ? 'cURL' : 'Python'}
              </button>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Request</p>
            <CodeBlock code={tab === 'curl' ? endpoint.curl : pythonExample} language="bash" />
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Response</p>
            <CodeBlock code={endpoint.response} language="json" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ApiDocsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Sort groups alphabetically by label
  const sortedGroups = [...GROUPS].sort((a, b) => a.label.localeCompare(b.label));

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <AppShell>
      <div className="max-w-[1440px] mx-auto px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Book className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">API Reference</h1>
          </div>
          <p className="text-muted-foreground ml-13">
            Integrate TrackAudit data directly into your own tooling with the REST API.
          </p>
        </div>

        <div className="flex gap-8">
          {/* ── Left sidebar ── */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-8 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
                Endpoints
              </p>
              {/* Authentication guide link */}
              <button
                onClick={() => scrollTo('auth-guide')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Authentication
              </button>
              {sortedGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => scrollTo(group.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {group.label}
                </button>
              ))}
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0 space-y-12">
            {/* Authentication guide */}
            <section id="auth-guide" className="scroll-mt-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Authentication</h2>
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  All API requests require a Bearer token in the{' '}
                  <code className="px-1.5 py-0.5 bg-muted rounded text-foreground font-mono text-xs">
                    Authorization
                  </code>{' '}
                  header.
                </p>

                <CodeBlock code={`Authorization: Bearer <your_access_token>`} language="bash" />

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Where to get a token
                    </p>
                    <p className="text-sm text-foreground">
                      POST to{' '}
                      <code className="text-xs font-mono text-primary">/api/auth/login/</code> with
                      your credentials.
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Token lifetime
                    </p>
                    <p className="text-sm text-foreground">Access tokens expire after 60 minutes.</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Refresh
                    </p>
                    <p className="text-sm text-foreground">
                      Use{' '}
                      <code className="text-xs font-mono text-primary">
                        /api/auth/token/refresh/
                      </code>{' '}
                      with your refresh token.
                    </p>
                  </div>
                </div>

                {/* Login example */}
                <div className="pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Example: obtain a token
                  </p>
                  <div className="space-y-3">
                    <CodeBlock
                      code={`curl -X POST https://app.trackaudit.io/api/auth/login/ \\
  -H "Content-Type: application/json" \\
  -d '{"email": "you@agency.com", "password": "your_password"}'`}
                      language="bash"
                    />
                    <CodeBlock
                      code={`import requests

resp = requests.post(
    "https://app.trackaudit.io/api/auth/login/",
    json={"email": "you@agency.com", "password": "your_password"},
)
tokens = resp.json()
access_token = tokens["access"]`}
                      language="bash"
                    />
                  </div>
                </div>

                {user && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Signed in as <span className="font-medium text-foreground">{user.email}</span>.
                      Generate an API token from{' '}
                      <button
                        onClick={() => navigate('/settings')}
                        className="text-primary hover:underline"
                      >
                        Settings
                      </button>
                      .
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Endpoint groups */}
            {sortedGroups.map(group => (
              <section key={group.id} id={group.id} className="scroll-mt-6">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-foreground">{group.label}</h2>
                  <Badge variant="secondary">{group.endpoints.length}</Badge>
                </div>
                <div>
                  {group.endpoints.map((ep, i) => (
                    <EndpointRow key={`${group.id}-${i}`} endpoint={ep} />
                  ))}
                </div>
              </section>
            ))}

            {/* Footer */}
            <div className="border-t border-border pt-8 pb-4">
              <p className="text-sm text-muted-foreground">
                Need help? Email{' '}
                <a href="mailto:support@trackaudit.io" className="text-primary hover:underline">
                  support@trackaudit.io
                </a>{' '}
                or visit our{' '}
                <button onClick={() => navigate('/settings')} className="text-primary hover:underline">
                  developer settings
                </button>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
