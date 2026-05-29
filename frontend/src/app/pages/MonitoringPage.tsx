import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  Play, PauseCircle, Calendar, Clock, CheckCircle2,
  Building2, AlertTriangle, Eye, RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { AppShell } from '../components/AppShell';
import { HealthScoreRing } from '../components/HealthScoreRing';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Switch } from '../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
import type { AuditSchedule, MonitoredAccount } from '../../lib/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function accountStatusVariant(
  status: MonitoredAccount['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'paused':
      return 'secondary';
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
}

function accountStatusColor(status: MonitoredAccount['status']): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0';
    case 'paused':
      return '';
    case 'error':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0';
    default:
      return '';
  }
}

// ── Account Card ───────────────────────────────────────────────────────────────

interface AccountCardProps {
  account: MonitoredAccount;
  isRunning: boolean;
  onRunAudit: (accountId: string) => void;
}

function AccountCard({ account, isRunning, onRunAudit }: AccountCardProps) {
  const score = account.latest_health_score ?? null;
  const criticals = account.open_critical_count ?? 0;

  return (
    <Card className="flex flex-col gap-0 overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold text-foreground truncate">
              {account.account_name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {account.google_ads_customer_id}
            </p>
          </div>
          <Badge
            variant={accountStatusVariant(account.status)}
            className={['capitalize text-xs', accountStatusColor(account.status)].join(' ')}
          >
            {account.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1">
        {/* Health score ring */}
        <div className="flex items-center justify-center py-2">
          {score !== null ? (
            <HealthScoreRing score={score} size="sm" />
          ) : (
            <div className="w-[60px] h-[60px] rounded-full border-4 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">N/A</span>
            </div>
          )}
        </div>

        {/* Critical alerts */}
        {criticals > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="text-xs font-medium text-red-700 dark:text-red-400">
              {criticals} critical alert{criticals !== 1 ? 's' : ''} open
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => onRunAudit(account.id)}
            disabled={isRunning}
          >
            {isRunning ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {isRunning ? 'Starting…' : 'Run Audit'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            asChild
          >
            <Link to={`/accounts/${account.id}`}>
              <Eye className="w-3 h-3" />
              View
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Schedule row helpers ───────────────────────────────────────────────────────

function LastRunCell({ schedule }: { schedule: AuditSchedule }) {
  if (!schedule.last_run_at) {
    return <span className="text-muted-foreground text-sm">Never</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
      <span className="text-sm text-muted-foreground">
        {formatDistanceToNow(new Date(schedule.last_run_at), { addSuffix: true })}
      </span>
    </div>
  );
}

function NextRunCell({ nextRunAt }: { nextRunAt: string | null }) {
  if (!nextRunAt) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Clock className="w-3.5 h-3.5 shrink-0" />
      {formatDistanceToNow(new Date(nextRunAt), { addSuffix: true })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function MonitoringPage() {
  const { workspace } = useAuth();
  const navigate = useNavigate();
  const wsId = workspace?.id ?? '';

  const [pausingAll, setPausingAll] = useState(false);
  const [localSchedules, setLocalSchedules] = useState<Record<number, Partial<AuditSchedule>>>({});
  const [runningAccounts, setRunningAccounts] = useState<Set<string>>(new Set());

  // Data fetching
  const { data: accountsData, isLoading: loadingAccounts } = useApi(
    () =>
      wsId
        ? api.accounts.list(wsId)
        : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    [wsId],
  );

  const { data: schedulesData, isLoading: loadingSchedules } = useApi(
    () =>
      wsId
        ? api.audits.schedules.list(wsId)
        : Promise.resolve([] as AuditSchedule[]),
    [wsId],
  );

  const accounts: MonitoredAccount[] = accountsData?.results ?? [];
  const schedules: AuditSchedule[] = schedulesData ?? [];
  const mergedSchedules = schedules.map(s => ({ ...s, ...(localSchedules[s.id] ?? {}) }));
  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]));
  const activeCount = mergedSchedules.filter(s => s.is_active).length;

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleRunAudit = async (accountId: string) => {
    if (!wsId) return;
    setRunningAccounts(prev => new Set(prev).add(accountId));
    try {
      const run = await api.audits.run(wsId, accountId);
      toast.success('Audit started successfully.');
      navigate(`/audit/${run.id}/running`);
    } catch {
      toast.error('Failed to start audit. Please try again.');
    } finally {
      setRunningAccounts(prev => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
    }
  };

  const handleFrequencyChange = async (
    schedule: AuditSchedule,
    frequency: 'daily' | 'weekly',
  ) => {
    setLocalSchedules(prev => ({ ...prev, [schedule.id]: { ...prev[schedule.id], frequency } }));
    try {
      await api.audits.schedules.update(wsId, schedule.id, { frequency });
      toast.success('Schedule updated.');
    } catch {
      toast.error('Failed to update schedule.');
      setLocalSchedules(prev => {
        const next = { ...prev };
        delete next[schedule.id];
        return next;
      });
    }
  };

  const handleToggleActive = async (schedule: AuditSchedule, is_active: boolean) => {
    setLocalSchedules(prev => ({
      ...prev,
      [schedule.id]: { ...prev[schedule.id], is_active },
    }));
    try {
      await api.audits.schedules.update(wsId, schedule.id, { is_active });
    } catch {
      toast.error('Failed to update schedule.');
      setLocalSchedules(prev => {
        const next = { ...prev };
        delete next[schedule.id];
        return next;
      });
    }
  };

  const handlePauseAll = async () => {
    if (!wsId || mergedSchedules.length === 0) return;
    setPausingAll(true);
    const active = mergedSchedules.filter(s => s.is_active);
    try {
      await Promise.all(
        active.map(s => api.audits.schedules.update(wsId, s.id, { is_active: false })),
      );
      const overrides: Record<number, Partial<AuditSchedule>> = {};
      active.forEach(s => {
        overrides[s.id] = { ...(localSchedules[s.id] ?? {}), is_active: false };
      });
      setLocalSchedules(prev => ({ ...prev, ...overrides }));
      toast.success('All schedules paused.');
    } catch {
      toast.error('Failed to pause all schedules.');
    } finally {
      setPausingAll(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppShell accountCount={accounts.length}>
      <div className="max-w-[1440px] mx-auto px-8 py-10 space-y-10">

        {/* ── Page Header ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Accounts</h1>
            <p className="text-muted-foreground">
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} monitored
              {activeCount > 0 && ` · ${activeCount} active schedule${activeCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handlePauseAll}
            disabled={pausingAll || activeCount === 0}
            className="gap-2"
          >
            <PauseCircle className="w-4 h-4" />
            {pausingAll ? 'Pausing…' : 'Pause All Schedules'}
          </Button>
        </div>

        {/* ── Account Health Overview ────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Account Health</h2>

          {loadingAccounts ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map(i => (
                <Card key={i}>
                  <CardContent className="py-6 space-y-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-[60px] w-[60px] rounded-full mx-auto" />
                    <Skeleton className="h-8 w-full" />
                    <div className="grid grid-cols-2 gap-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
                <div className="p-5 rounded-2xl bg-muted">
                  <Building2 className="w-10 h-10 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">No accounts yet</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Connect a Google Ads account to start monitoring performance and health.
                  </p>
                </div>
                <Button onClick={() => navigate('/integrations')} className="mt-2">
                  Connect Account
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map(account => (
                <AccountCard
                  key={account.id}
                  account={account}
                  isRunning={runningAccounts.has(account.id)}
                  onRunAudit={handleRunAudit}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Audit Schedules ────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Audit Schedules</h2>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {loadingSchedules ? (
              <div className="p-10 space-y-3">
                {[0, 1, 2].map(i => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : mergedSchedules.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-4 text-center">
                <div className="p-5 rounded-2xl bg-muted">
                  <Calendar className="w-10 h-10 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">No schedules configured</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Schedules are created automatically when you add accounts.
                  </p>
                </div>
                <Button onClick={() => navigate('/integrations')} className="mt-2">
                  Add Account
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {['Account', 'Frequency', 'Active', 'Last Run', 'Next Run', 'Actions'].map(h => (
                        <th
                          key={h}
                          className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mergedSchedules.map(schedule => {
                      const account = accountMap[schedule.account];
                      const accountName =
                        schedule.account_name ?? account?.account_name ?? String(schedule.account);
                      const isRunning = runningAccounts.has(schedule.account);

                      return (
                        <tr
                          key={schedule.id}
                          className="hover:bg-muted/40 transition-colors"
                        >
                          {/* Account */}
                          <td className="px-6 py-4">
                            <Link
                              to={`/accounts/${schedule.account}`}
                              className="font-medium text-foreground hover:text-primary transition-colors"
                            >
                              {accountName}
                            </Link>
                            {account?.google_ads_customer_id && (
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                {account.google_ads_customer_id}
                              </p>
                            )}
                          </td>

                          {/* Frequency */}
                          <td className="px-6 py-4">
                            <Select
                              value={schedule.frequency}
                              onValueChange={v =>
                                handleFrequencyChange(schedule, v as 'daily' | 'weekly')
                              }
                            >
                              <SelectTrigger size="sm" className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Active toggle */}
                          <td className="px-6 py-4">
                            <Switch
                              checked={schedule.is_active}
                              onCheckedChange={checked => handleToggleActive(schedule, checked)}
                            />
                          </td>

                          {/* Last run */}
                          <td className="px-6 py-4">
                            <LastRunCell schedule={schedule} />
                          </td>

                          {/* Next run */}
                          <td className="px-6 py-4">
                            <NextRunCell nextRunAt={schedule.next_run_at ?? null} />
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRunAudit(schedule.account)}
                              disabled={isRunning}
                              className="gap-1.5"
                            >
                              {isRunning ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              {isRunning ? 'Starting…' : 'Run Now'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
