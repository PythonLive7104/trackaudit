import React, { useState, useMemo } from 'react';
import {
  subDays,
  subMonths,
  format,
  parseISO,
  startOfDay,
  differenceInMinutes,
} from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart2,
  ChevronDown,
  CheckSquare,
  Square,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
import type { MonitoredAccount, AuditRun, Alert, HealthScoreEntry } from '../../lib/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const DATE_RANGES = [
  { label: '7d',  days: 7   },
  { label: '30d', days: 30  },
  { label: '90d', days: 90  },
  { label: '12m', days: 365 },
] as const;

const ACCOUNT_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
] as const;

const DISTRIBUTION_SEGMENTS = [
  { label: 'Excellent', range: '≥ 90', min: 90, max: 100, color: '#10B981' },
  { label: 'Good',      range: '70–89', min: 70, max: 89,  color: '#3B82F6' },
  { label: 'Fair',      range: '50–69', min: 50, max: 69,  color: '#F59E0B' },
  { label: 'Poor',      range: '< 50',  min: 0,  max: 49,  color: '#EF4444' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function healthColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function healthLabel(score: number): string {
  if (score >= 80) return 'Healthy';
  if (score >= 50) return 'Fair';
  return 'Critical';
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.15)',
  color: 'var(--card-foreground)',
  fontSize: '12px',
};

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
      <BarChart2 className="w-9 h-9 opacity-40" />
      <p className="text-sm font-medium">{message}</p>
      <p className="text-xs opacity-70">Run audits to see analytics</p>
    </div>
  );
}

// ── Summary stat card ─────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  loading?: boolean;
}

function StatCard({ label, value, sub, icon: Icon, iconColor, loading }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${iconColor}18` }}
      >
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
        {loading ? (
          <div className="h-7 w-16 bg-muted rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        )}
        {sub && !loading && (
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ── Account multi-select ──────────────────────────────────────────────────────

interface AccountFilterProps {
  accounts: MonitoredAccount[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
}

function AccountFilter({ accounts, selected, onToggle, onSelectAll }: AccountFilterProps) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.size === accounts.length;
  const label = allSelected ? 'All accounts' : `${selected.size} of ${accounts.length} accounts`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-card text-sm hover:bg-muted transition-colors"
      >
        <span className="text-muted-foreground">Filter:</span>
        <span className="font-medium text-foreground">{label}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-20 bg-card border border-border rounded-xl shadow-xl w-60 overflow-hidden">
            {/* Select all */}
            <button
              onClick={onSelectAll}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-muted transition-colors border-b border-border font-medium text-foreground"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              Select all
            </button>

            <div className="max-h-56 overflow-y-auto py-1">
              {accounts.slice(0, 10).map(account => {
                const checked = selected.has(account.id);
                const score = account.latest_health_score;
                return (
                  <button
                    key={account.id}
                    onClick={() => onToggle(account.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate flex-1">{account.account_name}</span>
                    {score != null && (
                      <span
                        className="text-xs font-semibold shrink-0"
                        style={{ color: healthColor(score) }}
                      >
                        {score}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Health Score Trend chart ──────────────────────────────────────────────────

interface HealthTrendChartProps {
  accounts: MonitoredAccount[];
  selectedIds: Set<string>;
  wsId: string;
  cutoffDate: Date;
}

function HealthTrendChart({ accounts, selectedIds, wsId, cutoffDate }: HealthTrendChartProps) {
  const selectedAccounts = accounts
    .filter(a => selectedIds.has(a.id))
    .slice(0, 5); // max 5 lines

  const { data: historyMap, isLoading } = useApi<Record<string, HealthScoreEntry[]>>(
    async () => {
      if (!wsId || selectedAccounts.length === 0) return {};
      const entries = await Promise.all(
        selectedAccounts.map(a =>
          api.audits.healthHistory(wsId, a.id).then(h => [a.id, h] as const),
        ),
      );
      return Object.fromEntries(entries);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wsId, [...selectedIds].sort().join(',')],
  );

  const chartData = useMemo(() => {
    if (!historyMap) return [];
    const dateSet = new Set<string>();
    Object.values(historyMap).forEach(entries =>
      entries.forEach(e => {
        const d = parseISO(e.recorded_at);
        if (d >= cutoffDate) dateSet.add(format(startOfDay(d), 'yyyy-MM-dd'));
      }),
    );
    const sortedDates = Array.from(dateSet).sort();
    return sortedDates.map(date => {
      const row: Record<string, string | number> = { date: format(parseISO(date), 'MMM d') };
      Object.entries(historyMap).forEach(([accountId, entries]) => {
        const match = entries
          .filter(e => format(startOfDay(parseISO(e.recorded_at)), 'yyyy-MM-dd') === date)
          .at(-1);
        if (match) row[accountId] = match.score;
      });
      return row;
    });
  }, [historyMap, cutoffDate]);

  if (isLoading) return <Spinner />;
  if (chartData.length === 0) return <EmptyChart message="No health history in this period" />;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          stroke="var(--border)"
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          stroke="var(--border)"
          tickLine={false}
          tickFormatter={v => `${v}`}
          label={{ value: 'Score', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: 'var(--muted-foreground)' } }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: 'var(--card-foreground)', fontWeight: 600, marginBottom: 4 }}
          formatter={(value: number, name: string) => {
            const account = selectedAccounts.find(a => a.id === name);
            return [`${value} — ${healthLabel(value)}`, account?.account_name ?? name];
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          formatter={name => {
            const account = selectedAccounts.find(a => a.id === name);
            return account?.account_name ?? name;
          }}
        />
        {selectedAccounts.map((account, i) => (
          <Line
            key={account.id}
            type="monotone"
            dataKey={account.id}
            name={account.id}
            stroke={ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Alert Frequency chart ─────────────────────────────────────────────────────

interface AlertFrequencyChartProps {
  alerts: Alert[];
  cutoffDate: Date;
  rangeDays: number;
  isLoading: boolean;
}

function AlertFrequencyChart({ alerts, cutoffDate, rangeDays, isLoading }: AlertFrequencyChartProps) {
  const chartData = useMemo(() => {
    const filtered = alerts.filter(a => parseISO(a.first_detected_at) >= cutoffDate);
    const byWeek = rangeDays > 30;

    const buckets: Record<string, { label: string; critical: number; warning: number; info: number }> = {};

    filtered.forEach(alert => {
      const d = parseISO(alert.first_detected_at);
      let key: string;
      let label: string;
      if (byWeek) {
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        key = format(monday, 'yyyy-MM-dd');
        label = format(monday, 'MMM d');
      } else {
        key = format(d, 'yyyy-MM-dd');
        label = format(d, 'MMM d');
      }
      if (!buckets[key]) buckets[key] = { label, critical: 0, warning: 0, info: 0 };
      if (alert.severity === 'critical') buckets[key].critical += 1;
      else if (alert.severity === 'warning') buckets[key].warning += 1;
      else buckets[key].info += 1;
    });

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [alerts, cutoffDate, rangeDays]);

  if (isLoading) return <Spinner />;
  if (chartData.length === 0) return <EmptyChart message="No alerts in this period" />;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          stroke="var(--border)"
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          stroke="var(--border)"
          tickLine={false}
          label={{ value: 'Alerts', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: 'var(--muted-foreground)' } }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: 'var(--card-foreground)', fontWeight: 600, marginBottom: 4 }}
          cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="critical" name="Critical" stackId="a" fill="#EF4444" />
        <Bar dataKey="warning"  name="Warning"  stackId="a" fill="#F59E0B" />
        <Bar dataKey="info"     name="Info"     stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Account Health Distribution pie chart ─────────────────────────────────────

interface HealthDistributionChartProps {
  accounts: MonitoredAccount[];
}

function HealthDistributionChart({ accounts }: HealthDistributionChartProps) {
  const chartData = useMemo(() => {
    return DISTRIBUTION_SEGMENTS.map(seg => ({
      name: seg.label,
      range: seg.range,
      color: seg.color,
      value: accounts.filter(a => {
        const s = a.latest_health_score ?? 0;
        return s >= seg.min && s <= seg.max;
      }).length,
    })).filter(d => d.value > 0);
  }, [accounts]);

  if (accounts.length === 0) return <EmptyChart message="No accounts to display" />;
  if (chartData.length === 0) return <EmptyChart message="No health data available" />;

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-6">
      <div className="shrink-0 w-[200px] h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, i) => (
                <Cell key={`cell-${i}`} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number, name: string) => [
                `${value} account${value !== 1 ? 's' : ''} (${Math.round((value / total) * 100)}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-3">
        {DISTRIBUTION_SEGMENTS.map(seg => {
          const count = accounts.filter(a => {
            const s = a.latest_health_score ?? 0;
            return s >= seg.min && s <= seg.max;
          }).length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={seg.label} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-foreground">{seg.label}</span>
                  <span className="text-xs font-semibold text-foreground">{count}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: seg.color }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Recent Audit Performance table ────────────────────────────────────────────

interface AuditTableProps {
  audits: AuditRun[];
  accounts: MonitoredAccount[];
  cutoffDate: Date;
  isLoading: boolean;
}

function AuditPerformanceTable({ audits, accounts, cutoffDate, isLoading }: AuditTableProps) {
  const accountMap = useMemo(
    () => Object.fromEntries(accounts.map(a => [a.id, a])),
    [accounts],
  );

  const recentAudits = useMemo(
    () =>
      audits
        .filter(r => r.status === 'completed' && r.completed_at && parseISO(r.created_at) >= cutoffDate)
        .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
        .slice(0, 10),
    [audits, cutoffDate],
  );

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (recentAudits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
        <BarChart2 className="w-9 h-9 opacity-40" />
        <p className="text-sm font-medium">No completed audits in this period</p>
        <p className="text-xs opacity-70">Run audits to see performance data</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {['Account', 'Health Score', 'Pass', 'Warnings', 'Critical', 'Duration', 'Date'].map(h => (
              <th
                key={h}
                className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {recentAudits.map(run => {
            const account = accountMap[run.account];
            const score = run.health_score ?? 0;
            const duration =
              run.started_at && run.completed_at
                ? differenceInMinutes(parseISO(run.completed_at), parseISO(run.started_at))
                : null;

            return (
              <tr key={run.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-5 py-3.5 font-medium text-foreground truncate max-w-[180px]">
                  {account?.account_name ?? run.account_name ?? '—'}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: healthColor(score) }}
                    >
                      {score}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: `${healthColor(score)}18`,
                        color: healthColor(score),
                      }}
                    >
                      {healthLabel(score)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {run.pass_count}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium tabular-nums">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {run.warning_count}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium tabular-nums">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {run.critical_count}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground tabular-nums">
                  {duration != null ? `${duration}m` : '—'}
                </td>
                <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                  {run.completed_at
                    ? format(parseISO(run.completed_at), 'MMM d, yyyy · HH:mm')
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const { workspace } = useAuth();
  const wsId = workspace?.id ?? '';

  const [rangeDays, setRangeDays] = useState<number>(30);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [accountsInitialised, setAccountsInitialised] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: accountsData, isLoading: loadingAccounts } = useApi(
    () =>
      wsId
        ? api.accounts.list(wsId)
        : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    [wsId],
  );

  const { data: auditsData, isLoading: loadingAudits } = useApi(
    () =>
      wsId
        ? api.audits.list(wsId)
        : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    [wsId],
  );

  const { data: alertsData, isLoading: loadingAlerts } = useApi(
    () =>
      wsId
        ? api.alerts.list(wsId)
        : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    [wsId],
  );

  // ── Derived data ───────────────────────────────────────────────────────────

  const accounts: MonitoredAccount[] = accountsData?.results ?? [];
  const audits: AuditRun[] = auditsData?.results ?? [];
  const alerts: Alert[] = alertsData?.results ?? [];

  // Initialise all accounts selected once loaded
  if (!accountsInitialised && accounts.length > 0) {
    setSelectedAccountIds(new Set(accounts.map(a => a.id)));
    setAccountsInitialised(true);
  }

  const cutoffDate = useMemo(() => {
    if (rangeDays === 365) return subMonths(new Date(), 12);
    return subDays(new Date(), rangeDays);
  }, [rangeDays]);

  // ── Summary stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const periodAudits = audits.filter(
      r => r.status === 'completed' && parseISO(r.created_at) >= cutoffDate,
    );

    const totalAudits = periodAudits.length;

    const avgHealth =
      accounts.length > 0
        ? Math.round(
            accounts.reduce((s, a) => s + (a.latest_health_score ?? 0), 0) / accounts.length,
          )
        : 0;

    const issuesFound = periodAudits.reduce(
      (s, r) => s + r.warning_count + r.critical_count,
      0,
    );

    const totalPasses = periodAudits.reduce((s, r) => s + r.pass_count, 0);
    const totalChecks = periodAudits.reduce(
      (s, r) => s + r.pass_count + r.warning_count + r.critical_count,
      0,
    );
    const passRate = totalChecks > 0 ? Math.round((totalPasses / totalChecks) * 100) : 0;

    return { totalAudits, avgHealth, issuesFound, passRate };
  }, [audits, accounts, cutoffDate]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleAccount = (id: string) => {
    setSelectedAccountIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAccountIds.size === accounts.length) {
      setSelectedAccountIds(new Set());
    } else {
      setSelectedAccountIds(new Set(accounts.map(a => a.id)));
    }
  };

  const rangeLabel = useMemo(() => {
    const end = format(new Date(), 'MMM d, yyyy');
    const start = format(cutoffDate, 'MMM d, yyyy');
    return `${start} – ${end}`;
  }, [cutoffDate]);

  return (
    <AppShell accountCount={accounts.length}>
      <div className="max-w-[1440px] mx-auto px-8 py-8 space-y-8">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Analytics</h1>
            <p className="text-muted-foreground text-sm">{rangeLabel}</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Date range pill tabs */}
            <div className="flex items-center gap-0.5 bg-muted rounded-lg p-1">
              {DATE_RANGES.map(r => (
                <button
                  key={r.days}
                  onClick={() => setRangeDays(r.days)}
                  className={`px-4 py-1.5 text-sm rounded-md font-medium transition-all ${
                    rangeDays === r.days
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Account multi-select */}
            {!loadingAccounts && accounts.length > 0 && (
              <AccountFilter
                accounts={accounts}
                selected={selectedAccountIds}
                onToggle={toggleAccount}
                onSelectAll={toggleSelectAll}
              />
            )}
          </div>
        </div>

        {/* ── Summary stats row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Audits Run"
            value={stats.totalAudits}
            sub={`In the last ${rangeDays === 365 ? '12 months' : `${rangeDays} days`}`}
            icon={Activity}
            iconColor="#3B82F6"
            loading={loadingAudits}
          />
          <StatCard
            label="Avg Health Score"
            value={`${stats.avgHealth}`}
            sub={stats.avgHealth >= 80 ? 'Good standing' : stats.avgHealth >= 50 ? 'Needs attention' : 'Critical'}
            icon={TrendingUp}
            iconColor={healthColor(stats.avgHealth)}
            loading={loadingAccounts}
          />
          <StatCard
            label="Issues Found"
            value={stats.issuesFound}
            sub="Warnings + Critical checks"
            icon={AlertTriangle}
            iconColor="#F59E0B"
            loading={loadingAudits}
          />
          <StatCard
            label="Pass Rate"
            value={`${stats.passRate}%`}
            sub="Passing checks vs total"
            icon={CheckCircle2}
            iconColor="#10B981"
            loading={loadingAudits}
          />
        </div>

        {/* ── Health Score Trend (full width) ── */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Health Score Trend</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Score history per account — up to 5 accounts shown
              </p>
            </div>
            {!loadingAccounts && accounts.length > 0 && (
              <AccountFilter
                accounts={accounts}
                selected={selectedAccountIds}
                onToggle={toggleAccount}
                onSelectAll={toggleSelectAll}
              />
            )}
          </div>
          <HealthTrendChart
            accounts={accounts}
            selectedIds={selectedAccountIds}
            wsId={wsId}
            cutoffDate={cutoffDate}
          />
        </div>

        {/* ── Alert Frequency + Health Distribution ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Alert Frequency */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-foreground">Alert Frequency</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Alerts grouped by severity per {rangeDays > 30 ? 'week' : 'day'}
              </p>
            </div>
            <AlertFrequencyChart
              alerts={alerts}
              cutoffDate={cutoffDate}
              rangeDays={rangeDays}
              isLoading={loadingAlerts}
            />
          </div>

          {/* Account Health Distribution */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-foreground">Account Health Distribution</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Accounts grouped by current health score band
              </p>
            </div>
            {loadingAccounts ? (
              <Spinner />
            ) : (
              <HealthDistributionChart accounts={accounts} />
            )}
          </div>
        </div>

        {/* ── Recent Audit Performance table ── */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Recent Audit Performance</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Last 10 completed audits in the selected period
              </p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
              {audits.filter(r => r.status === 'completed' && parseISO(r.created_at) >= cutoffDate).length} audits
            </span>
          </div>
          <AuditPerformanceTable
            audits={audits}
            accounts={accounts}
            cutoffDate={cutoffDate}
            isLoading={loadingAudits || loadingAccounts}
          />
        </div>
      </div>
    </AppShell>
  );
}
