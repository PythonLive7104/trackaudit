import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Play,
  FileDown,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import type { AuditCheck, AuditRun, CheckStatus, MonitoredAccount } from '../../lib/types';
import { useApi } from '../../hooks/useApi';
import { AppShell } from '../components/AppShell';
import { HealthScoreRing } from '../components/HealthScoreRing';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

// ── Status helpers ─────────────────────────────────────────────────────────────

function statusIcon(status: CheckStatus) {
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
    case 'critical':
      return <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
    case 'error':
    default:
      return <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />;
  }
}

function statusBadgeClass(status: CheckStatus): string {
  switch (status) {
    case 'pass':     return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    case 'warning':  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    case 'error':
    default:         return 'bg-muted text-muted-foreground border-border';
  }
}

function severityBadgeClass(severity: AuditCheck['severity']): string {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    case 'high':     return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
    case 'medium':   return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    case 'low':
    default:         return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
  }
}

// ── Audit Check Card ──────────────────────────────────────────────────────────

function AuditCheckCard({ check }: { check: AuditCheck }) {
  const [expanded, setExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {statusIcon(check.status)}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-foreground">{check.check_name}</span>
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${statusBadgeClass(check.status)}`}
            >
              {check.status}
            </span>
            <span
              className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${severityBadgeClass(check.severity)}`}
            >
              {check.severity}
            </span>
            <Badge variant="outline" className="text-xs capitalize">
              {check.category.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{check.finding_summary}</p>
        </div>

        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border bg-muted/20">
          {/* Explanation */}
          {check.explanation && (
            <div className="pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Explanation</p>
              <p className="text-sm text-foreground leading-relaxed">{check.explanation}</p>
            </div>
          )}

          {/* Fix Instructions */}
          {check.fix_instructions && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Fix Instructions</p>
              <pre className="bg-background border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground whitespace-pre-wrap break-words leading-relaxed">
                {check.fix_instructions}
              </pre>
            </div>
          )}

          {/* Raw data toggle */}
          {Object.keys(check.raw_data ?? {}).length > 0 && (
            <div>
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => setShowRaw(r => !r)}
              >
                {showRaw ? 'Hide raw data' : 'Show raw data'}
              </button>
              {showRaw && (
                <pre className="mt-2 bg-background border border-border rounded-md px-3 py-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words overflow-x-auto max-h-48">
                  {JSON.stringify(check.raw_data, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Grouped checks (by category) ─────────────────────────────────────────────

function CheckGroup({ category, checks }: { category: string; checks: AuditCheck[] }) {
  const [open, setOpen] = useState(true);
  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.length - passCount;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        <span className="flex-1 text-sm font-semibold text-foreground capitalize">
          {category.replace(/_/g, ' ')}
        </span>
        <span className="text-xs text-muted-foreground">
          {passCount}/{checks.length} passed
        </span>
        {failCount > 0 && (
          <span className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold">
            {failCount}
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border/60">
          {checks.map(check => (
            <AuditCheckCard key={check.id} check={check} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Overview summary cards ─────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  count: number;
  colorClass: string;
  icon: ReactNode;
}

function SummaryCard({ label, count, colorClass, icon }: SummaryCardProps) {
  return (
    <div className={`flex items-center gap-4 bg-card border border-border rounded-xl px-5 py-4`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{count}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ── Timeline row ───────────────────────────────────────────────────────────────

function TimelineRow({ run }: { run: AuditRun }) {
  const navigate = useNavigate();

  const scoreColor =
    run.health_score == null ? 'text-muted-foreground'
    : run.health_score >= 80 ? 'text-emerald-600 dark:text-emerald-400'
    : run.health_score >= 60 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <tr className="hover:bg-muted/40 transition-colors">
      <td className="px-5 py-3 text-sm text-foreground">
        {run.completed_at
          ? formatDistanceToNow(new Date(run.completed_at), { addSuffix: true })
          : run.started_at
            ? formatDistanceToNow(new Date(run.started_at), { addSuffix: true })
            : '—'}
      </td>
      <td className={`px-5 py-3 text-sm font-semibold ${scoreColor}`}>
        {run.health_score != null ? run.health_score : '—'}
      </td>
      <td className="px-5 py-3 text-sm capitalize text-muted-foreground">{run.trigger_type}</td>
      <td className="px-5 py-3 text-sm">
        <span
          className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${
            run.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
            : run.status === 'failed'  ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
            : run.status === 'running' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
            : 'bg-muted text-muted-foreground border-border'
          }`}
        >
          {run.status}
        </span>
      </td>
      <td className="px-5 py-3 text-sm">
        {run.status === 'completed' || run.status === 'running' ? (
          <button
            onClick={() => navigate(run.status === 'running' ? `/audit/${run.id}/running` : `/accounts/${run.account}`)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View <ExternalLink className="w-3 h-3" />
          </button>
        ) : '—'}
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AccountAuditPage() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { workspace } = useAuth();
  const wsId = workspace?.id ?? '';

  const [isRunning, setIsRunning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Data fetching
  const { data: account, isLoading: loadingAccount } = useApi<MonitoredAccount>(
    () => wsId && accountId ? api.accounts.get(wsId, accountId) : Promise.reject('no ids'),
    [wsId, accountId],
  );

  const { data: auditRunsData, isLoading: loadingRuns } = useApi(
    () => wsId && accountId
      ? api.audits.list(wsId, { account_id: accountId })
      : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    [wsId, accountId],
  );

  const auditRuns: AuditRun[] = auditRunsData?.results ?? [];
  const latestRun = auditRuns.find(r => r.status === 'completed') ?? auditRuns[0] ?? null;

  const { data: checks, isLoading: loadingChecks } = useApi<AuditCheck[]>(
    () => wsId && latestRun?.id
      ? api.audits.checks(wsId, latestRun.id)
      : Promise.resolve([]),
    [wsId, latestRun?.id],
  );

  const allChecks: AuditCheck[] = checks ?? [];

  // Grouped by category
  const grouped = allChecks.reduce<Record<string, AuditCheck[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});

  const failedChecks = allChecks.filter(c => c.status === 'critical' || c.status === 'error');
  const warningChecks = allChecks.filter(c => c.status === 'warning');

  // Counts from the latest run (fallback to computed)
  const passCount    = latestRun?.pass_count     ?? allChecks.filter(c => c.status === 'pass').length;
  const warningCount = latestRun?.warning_count   ?? warningChecks.length;
  const criticalCount= latestRun?.critical_count  ?? allChecks.filter(c => c.status === 'critical').length;
  const errorCount   = latestRun?.error_count     ?? allChecks.filter(c => c.status === 'error').length;

  const healthScore = latestRun?.health_score ?? account?.latest_health_score ?? 0;

  const lastAuditText = latestRun?.completed_at
    ? formatDistanceToNow(new Date(latestRun.completed_at), { addSuffix: true })
    : 'Never';

  const handleRunAudit = async () => {
    if (!wsId || !accountId) return;
    setIsRunning(true);
    try {
      const run = await api.audits.run(wsId, accountId);
      navigate(`/audit/${run.id}/running`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportPDF = async () => {
    if (!wsId || !accountId) return;
    setIsExporting(true);
    try {
      await api.reports.generate(wsId, { account_id: accountId });
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = loadingAccount || loadingRuns || loadingChecks;

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto px-8 py-8 space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          {/* Favicon + name */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-border flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground truncate">
                {loadingAccount ? (
                  <span className="inline-block w-48 h-7 bg-muted animate-pulse rounded" />
                ) : (
                  account?.account_name ?? 'Account'
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {account?.google_ads_customer_id
                  ? `Google Ads · ${account.google_ads_customer_id}`
                  : 'Google Ads'}
              </p>
            </div>
          </div>

          {/* Health ring + last audit */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <HealthScoreRing score={healthScore} size="md" />
              <p className="text-xs text-muted-foreground mt-1">
                Last audit: <span className="text-foreground font-medium">{lastAuditText}</span>
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={handleRunAudit}
                disabled={isRunning}
                size="sm"
                className="gap-2"
              >
                <Play className="w-3.5 h-3.5" />
                {isRunning ? 'Starting…' : 'Run Audit'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
                className="gap-2"
              >
                <FileDown className="w-3.5 h-3.5" />
                {isExporting ? 'Generating…' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Overview cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard
            label="Passed"
            count={passCount}
            colorClass="bg-emerald-100 dark:bg-emerald-900/30"
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          />
          <SummaryCard
            label="Warnings"
            count={warningCount}
            colorClass="bg-amber-100 dark:bg-amber-900/30"
            icon={<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          />
          <SummaryCard
            label="Critical"
            count={criticalCount}
            colorClass="bg-red-100 dark:bg-red-900/30"
            icon={<XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
          />
          <SummaryCard
            label="Errors"
            count={errorCount}
            colorClass="bg-muted"
            icon={<AlertCircle className="w-5 h-5 text-muted-foreground" />}
          />
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="failed">
                Failed Checks
                {failedChecks.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold w-4 h-4 inline-flex items-center justify-center">
                    {failedChecks.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="warnings">
                Warnings
                {warningChecks.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold w-4 h-4 inline-flex items-center justify-center">
                    {warningChecks.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            {/* Overview — grouped by category */}
            <TabsContent value="overview" className="space-y-3">
              {Object.keys(grouped).length === 0 ? (
                <EmptyChecks message="No checks found for this account." />
              ) : (
                Object.entries(grouped).map(([cat, catChecks]) => (
                  <CheckGroup key={cat} category={cat} checks={catChecks} />
                ))
              )}
            </TabsContent>

            {/* Failed checks */}
            <TabsContent value="failed" className="space-y-2">
              {failedChecks.length === 0 ? (
                <EmptyChecks message="No critical or error checks." icon="pass" />
              ) : (
                failedChecks.map(c => <AuditCheckCard key={c.id} check={c} />)
              )}
            </TabsContent>

            {/* Warnings */}
            <TabsContent value="warnings" className="space-y-2">
              {warningChecks.length === 0 ? (
                <EmptyChecks message="No warnings." icon="pass" />
              ) : (
                warningChecks.map(c => <AuditCheckCard key={c.id} check={c} />)
              )}
            </TabsContent>

            {/* Timeline */}
            <TabsContent value="timeline">
              {auditRuns.length === 0 ? (
                <EmptyChecks message="No audit history yet." />
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          {['Date', 'Health Score', 'Trigger', 'Status', 'View'].map(h => (
                            <th
                              key={h}
                              className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {auditRuns.map(run => (
                          <TimelineRow key={run.id} run={run} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}

// ── Empty state helper ─────────────────────────────────────────────────────────

function EmptyChecks({ message, icon }: { message: string; icon?: 'pass' | 'default' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon === 'pass' ? (
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
      ) : (
        <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
      )}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
