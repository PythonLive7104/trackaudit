import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { formatDistanceToNow } from 'date-fns';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Activity,
  RefreshCw,
  Play,
  ArrowRight,
  Clock,
  RotateCcw,
  ChevronRight,
  AlertCircle,
  Info,
  Zap,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { MetricCard } from '../components/MetricCard';
import { HealthTrendChart } from '../components/HealthTrendChart';
import { HealthScoreRing } from '../components/HealthScoreRing';
import { Skeleton } from '../components/ui/skeleton';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import type { MonitoredAccount, AlertStats, AuditRun } from '../../lib/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${styles[status] ?? styles.error}`}>
      {status}
    </span>
  );
}

function AuditStatusBadge({ status }: { status: AuditRun['status'] }) {
  const styles: Record<AuditRun['status'], string> = {
    queued: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const labels: Record<AuditRun['status'], string> = {
    queued: 'Queued',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
  };
  return (
    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ── Skeleton loaders ─────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="w-12 h-12 rounded-xl" />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr>
      <td className="px-6 py-4">
        <Skeleton className="h-4 w-36 mb-1.5" />
        <Skeleton className="h-3 w-24" />
      </td>
      <td className="px-6 py-4"><Skeleton className="h-10 w-10 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
      <td className="px-6 py-4"><Skeleton className="h-6 w-8 rounded-full" /></td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-7 w-14 rounded-md" />
        </div>
      </td>
    </tr>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-24 px-6 text-center"
    >
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6 shadow-inner">
        <Building2 className="w-12 h-12 text-primary" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Connect your first account</h2>
      <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
        Link your Google Ads accounts to start monitoring conversion tracking health and catching issues before they cost you.
      </p>
      <button
        onClick={onGetStarted}
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/30"
      >
        <Zap className="w-4 h-4" />
        Get started
      </button>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user, workspace } = useAuth();
  const navigate = useNavigate();
  const wsId = workspace?.id ?? '';
  const [runningAuditIds, setRunningAuditIds] = useState<Set<string>>(new Set());

  const {
    data: accountsData,
    isLoading: loadingAccounts,
    refetch: refetchAccounts,
  } = useApi(
    () =>
      wsId
        ? api.accounts.list(wsId)
        : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    [wsId],
  );

  const { data: alertStats, isLoading: loadingAlerts, refetch: refetchAlerts } = useApi(
    () =>
      wsId
        ? api.alerts.stats(wsId)
        : Promise.resolve({ total_open: 0, critical: 0, warning: 0, info: 0 }),
    [wsId],
  );

  const { data: auditsData, isLoading: loadingAudits, refetch: refetchAudits } = useApi(
    () =>
      wsId
        ? api.audits.list(wsId)
        : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    [wsId],
  );

  const accounts: MonitoredAccount[] = accountsData?.results ?? [];
  const stats: AlertStats = alertStats ?? { total_open: 0, critical: 0, warning: 0, info: 0 };
  const allAudits: AuditRun[] = auditsData?.results ?? [];
  const recentAudits = allAudits.slice(0, 5);

  const healthyCount = accounts.filter((a) => (a.latest_health_score ?? 0) >= 80).length;
  const avgHealth = accounts.length
    ? Math.round(accounts.reduce((s, a) => s + (a.latest_health_score ?? 0), 0) / accounts.length)
    : 0;
  const activeAuditsCount = allAudits.filter(
    (r) => r.status === 'running' || r.status === 'queued',
  ).length;

  const isLoading = loadingAccounts || loadingAlerts || loadingAudits;

  const handleRefresh = () => {
    refetchAccounts();
    refetchAlerts();
    refetchAudits();
  };

  const handleRunAudit = async (accountId: string) => {
    if (!wsId || runningAuditIds.has(accountId)) return;
    setRunningAuditIds((prev) => new Set(prev).add(accountId));
    try {
      const run = await api.audits.run(wsId, accountId);
      navigate(`/audit/${run.id}/running`);
    } finally {
      setRunningAuditIds((prev) => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
    }
  };

  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  // stagger config
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, delay: i * 0.07, ease: 'easeOut' },
    }),
  };

  return (
    <AppShell alertCount={stats.total_open} accountCount={accounts.length}>
      <div className="max-w-[1440px] mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 space-y-6 lg:space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {getGreeting()},{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {user?.full_name ?? 'there'}
              </span>
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              {workspace && (
                <>
                  <span className="text-sm font-medium text-muted-foreground">
                    {workspace.name}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                </>
              )}
              <span className="text-sm text-muted-foreground">{today}</span>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors shadow-sm disabled:opacity-60 self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </motion.div>

        {/* ── Stat cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
            : (
              <>
                {[
                  {
                    title: 'Total Accounts',
                    value: String(accounts.length),
                    change: 'Monitored',
                    changeType: 'neutral' as const,
                    icon: Building2,
                    gradient: 'from-primary to-cyan-400',
                  },
                  {
                    title: 'Healthy Accounts',
                    value: String(healthyCount),
                    change: `${accounts.length ? Math.round((healthyCount / accounts.length) * 100) : 0}% of total`,
                    changeType: 'positive' as const,
                    icon: CheckCircle2,
                    gradient: 'from-emerald-500 to-teal-400',
                  },
                  {
                    title: 'Critical Alerts',
                    value: String(stats.critical),
                    change: `${stats.total_open} total open`,
                    changeType: (stats.critical > 0 ? 'negative' : 'positive') as const,
                    icon: AlertTriangle,
                    gradient: 'from-red-500 to-rose-400',
                  },
                  {
                    title: 'Avg Health Score',
                    value: String(avgHealth),
                    change: avgHealth >= 80 ? 'Healthy' : avgHealth >= 50 ? 'Needs attention' : 'Critical',
                    changeType: (avgHealth >= 80 ? 'positive' : 'negative') as const,
                    icon: TrendingUp,
                    gradient: 'from-violet-500 to-purple-400',
                  },
                  {
                    title: 'Active Audits',
                    value: String(activeAuditsCount),
                    change: 'Running or queued',
                    changeType: 'neutral' as const,
                    icon: Activity,
                    gradient: 'from-amber-500 to-orange-400',
                  },
                ].map((card, i) => (
                  <motion.div
                    key={card.title}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <MetricCard {...card} />
                  </motion.div>
                ))}
              </>
            )}
        </div>

        {/* ── Middle row: chart + alerts ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Health trend chart */}
          <motion.div
            custom={5}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-2"
          >
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Overall Health Trend</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Average health score across all accounts
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                  Live
                </span>
              </div>
              {/* HealthTrendChart renders its own card wrapper — render its inner chart inline */}
              <HealthTrendChart />
            </div>
          </motion.div>

          {/* Open alerts breakdown */}
          <motion.div
            custom={6}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-semibold text-foreground">Open Alerts</h3>
                {stats.total_open > 0 && (
                  <span className="text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5">
                    {stats.total_open}
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-4 flex-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-6" />
                      </div>
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : stats.total_open === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center py-8">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  </div>
                  <p className="font-semibold text-foreground">All clear!</p>
                  <p className="text-sm text-muted-foreground mt-1">No open alerts right now</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5 flex-1">
                  {[
                    {
                      label: 'Critical',
                      count: stats.critical,
                      icon: AlertCircle,
                      color: 'bg-red-500',
                      track: 'bg-red-100 dark:bg-red-900/20',
                      text: 'text-red-600 dark:text-red-400',
                    },
                    {
                      label: 'Warning',
                      count: stats.warning,
                      icon: AlertTriangle,
                      color: 'bg-amber-500',
                      track: 'bg-amber-100 dark:bg-amber-900/20',
                      text: 'text-amber-600 dark:text-amber-400',
                    },
                    {
                      label: 'Info',
                      count: stats.info,
                      icon: Info,
                      color: 'bg-blue-500',
                      track: 'bg-blue-100 dark:bg-blue-900/20',
                      text: 'text-blue-600 dark:text-blue-400',
                    },
                  ].map((row) => {
                    const pct = stats.total_open > 0 ? (row.count / stats.total_open) * 100 : 0;
                    const IconComp = row.icon;
                    return (
                      <div key={row.label}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <IconComp className={`w-4 h-4 ${row.text}`} />
                            <span className="text-sm font-medium text-foreground">{row.label}</span>
                          </div>
                          <span className={`text-sm font-bold ${row.text}`}>{row.count}</span>
                        </div>
                        <div className={`h-2 rounded-full ${row.track} overflow-hidden`}>
                          <motion.div
                            className={`h-full rounded-full ${row.color}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => navigate('/alerts')}
                    className="mt-auto flex items-center justify-center gap-1.5 w-full py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    View all alerts
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Recent activity timeline ────────────────────────────────────── */}
        <motion.div
          custom={7}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Recent Audit Activity</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Last 5 audit runs across all accounts</p>
              </div>
              <button
                onClick={() => navigate('/audits')}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="w-10 h-10 rounded-full" />
                  </div>
                ))}
              </div>
            ) : recentAudits.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No audit runs yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentAudits.map((run, i) => {
                  const account = accounts.find((a) => a.id === run.account);
                  const accountName = run.account_name ?? account?.account_name ?? 'Unknown Account';
                  const timeAgo = run.completed_at
                    ? formatDistanceToNow(new Date(run.completed_at), { addSuffix: true })
                    : run.started_at
                    ? formatDistanceToNow(new Date(run.started_at), { addSuffix: true })
                    : formatDistanceToNow(new Date(run.created_at), { addSuffix: true });

                  return (
                    <motion.div
                      key={run.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
                      className="px-3 sm:px-6 py-4 flex items-center gap-3 sm:gap-4 hover:bg-muted/30 transition-colors"
                    >
                      {/* Timeline dot */}
                      <div className="relative flex items-center justify-center shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${
                          run.status === 'completed'
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-400'
                            : run.status === 'running'
                            ? 'bg-gradient-to-br from-blue-500 to-cyan-400'
                            : run.status === 'failed'
                            ? 'bg-gradient-to-br from-red-500 to-rose-400'
                            : 'bg-gradient-to-br from-slate-400 to-slate-500'
                        }`}>
                          {run.status === 'completed'
                            ? <CheckCircle2 className="w-4 h-4" />
                            : run.status === 'running'
                            ? <Activity className="w-4 h-4 animate-pulse" />
                            : run.status === 'failed'
                            ? <AlertTriangle className="w-4 h-4" />
                            : <Clock className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{accountName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground capitalize">
                            {run.trigger_type} audit
                          </span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="text-xs text-muted-foreground">{timeAgo}</span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <AuditStatusBadge status={run.status} />

                      {/* Health ring — hidden on mobile */}
                      <div className="hidden sm:block">
                        {run.health_score !== null && run.status === 'completed' ? (
                          <HealthScoreRing score={run.health_score} size="sm" />
                        ) : (
                          <div className="w-[60px]" />
                        )}
                      </div>

                      {/* Re-run button */}
                      {run.account && (
                        <button
                          onClick={() => handleRunAudit(run.account)}
                          disabled={runningAuditIds.has(run.account)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Re-run
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Accounts table ─────────────────────────────────────────────── */}
        <motion.div
          custom={8}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Monitored Accounts</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
                </p>
              </div>
              <button
                onClick={() => navigate('/integrations')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20"
              >
                + Add account
              </button>
            </div>

            {isLoading ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Account', 'Health Score', 'Status', 'Last Audit', 'Critical Issues', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} />)}
                  </tbody>
                </table>
              </div>
            ) : accounts.length === 0 ? (
              <EmptyState onGetStarted={() => navigate('/onboarding')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {['Account', 'Health Score', 'Status', 'Last Audit', 'Critical Issues', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {accounts.map((account, i) => {
                      const lastAudit = allAudits.find((r) => r.account === account.id);
                      const lastAuditTime = account.latest_audit_at
                        ? formatDistanceToNow(new Date(account.latest_audit_at), { addSuffix: true })
                        : lastAudit?.completed_at
                        ? formatDistanceToNow(new Date(lastAudit.completed_at), { addSuffix: true })
                        : null;

                      return (
                        <motion.tr
                          key={account.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.05 * i }}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          {/* Account name + ID */}
                          <td className="px-6 py-4">
                            <button
                              onClick={() => navigate(`/accounts/${account.id}`)}
                              className="font-semibold text-foreground hover:text-primary transition-colors text-left"
                            >
                              {account.account_name}
                            </button>
                            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                              {account.google_ads_customer_id}
                            </p>
                          </td>

                          {/* Health ring */}
                          <td className="px-6 py-4">
                            <HealthScoreRing score={account.latest_health_score ?? 0} size="sm" />
                          </td>

                          {/* Status badge */}
                          <td className="px-6 py-4">
                            <StatusBadge status={account.status} />
                          </td>

                          {/* Last audit */}
                          <td className="px-6 py-4">
                            {lastAuditTime ? (
                              <span className="text-sm text-muted-foreground">{lastAuditTime}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Critical issues count */}
                          <td className="px-6 py-4">
                            {(account.open_critical_count ?? 0) > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-semibold">
                                {account.open_critical_count}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>

                          {/* Action buttons */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRunAudit(account.id)}
                                disabled={runningAuditIds.has(account.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors shadow-sm shadow-primary/20"
                              >
                                <Play className="w-3 h-3" />
                                {runningAuditIds.has(account.id) ? 'Starting…' : 'Run Audit'}
                              </button>
                              <button
                                onClick={() => navigate(`/accounts/${account.id}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
                              >
                                View
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </AppShell>
  );
}
