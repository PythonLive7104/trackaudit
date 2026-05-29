import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ClipboardCheck, Play, CheckCircle2, XCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { HealthScoreRing } from '../components/HealthScoreRing';
import type { AuditRun, AuditStatus } from '../../lib/types';
import { formatDistanceToNow } from 'date-fns';

function StatusBadge({ status }: { status: AuditStatus }) {
  const map: Record<AuditStatus, { label: string; className: string; icon: React.ReactNode }> = {
    queued:    { label: 'Queued',    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: <Clock className="w-3 h-3" /> },
    running:   { label: 'Running',   className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> },
    completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle2 className="w-3 h-3" /> },
    failed:    { label: 'Failed',    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3 h-3" /> },
  };
  const { label, className, icon } = map[status] ?? map.failed;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${className}`}>
      {icon}{label}
    </span>
  );
}

function TriggerBadge({ type }: { type: string }) {
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${
      type === 'manual'
        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    }`}>
      {type}
    </span>
  );
}

export function AuditsPage() {
  const { workspace } = useAuth();
  const navigate = useNavigate();
  const wsId = workspace?.id ?? '';

  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: auditsData, isLoading, refetch } =
    useApi(() => wsId ? api.audits.list(wsId) : Promise.resolve({ count: 0, next: null, previous: null, results: [] }), [wsId]);

  const { data: accountsData } =
    useApi(() => wsId ? api.accounts.list(wsId) : Promise.resolve({ count: 0, next: null, previous: null, results: [] }), [wsId]);

  const allAudits: AuditRun[] = auditsData?.results ?? [];
  const accounts = accountsData?.results ?? [];

  const filtered = statusFilter === 'all' ? allAudits : allAudits.filter(a => a.status === statusFilter);

  const handleRunAudit = async (accountId: string) => {
    if (!wsId) return;
    const run = await api.audits.run(wsId, accountId);
    navigate(`/audit/${run.id}/running`);
  };

  const accountName = (id: string) =>
    accounts.find(a => a.id === id)?.account_name ?? 'Unknown Account';

  return (
    <AppShell accountCount={accounts.length}>
      <div className="max-w-[1200px] mx-auto px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Audit History</h1>
            <p className="text-muted-foreground">All audit runs across your monitored accounts</p>
          </div>
          <div className="flex items-center gap-3">
            {accounts.length > 0 && (
              <select
                className="text-sm border border-border rounded-lg px-3 py-2 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                onChange={e => { if (e.target.value) handleRunAudit(e.target.value); e.target.value = ''; }}
                defaultValue=""
              >
                <option value="" disabled>Run audit on…</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.account_name}</option>
                ))}
              </select>
            )}
            <button
              onClick={refetch}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(
            [
              { label: 'Total Runs',  value: allAudits.length, color: 'text-foreground' },
              { label: 'Completed',   value: allAudits.filter(a => a.status === 'completed').length, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Running',     value: allAudits.filter(a => a.status === 'running' || a.status === 'queued').length, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Failed',      value: allAudits.filter(a => a.status === 'failed').length, color: 'text-red-600 dark:text-red-400' },
            ] as const
          ).map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          {['all', 'completed', 'running', 'queued', 'failed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-foreground hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>

        {/* Audit runs list */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-10 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground mb-1">
                {statusFilter === 'all' ? 'No audit runs yet' : `No ${statusFilter} audits`}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {statusFilter === 'all'
                  ? 'Run an audit from the Dashboard or Accounts page to get started.'
                  : 'Try changing the status filter above.'}
              </p>
              {statusFilter === 'all' && accounts.length > 0 && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Go to Dashboard
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(run => (
                <div
                  key={run.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
                >
                  {/* Health score */}
                  <div className="shrink-0">
                    {run.status === 'completed' && run.health_score != null ? (
                      <HealthScoreRing score={run.health_score} size={44} />
                    ) : (
                      <div className="w-11 h-11 rounded-full border-2 border-border flex items-center justify-center">
                        {run.status === 'running' || run.status === 'queued'
                          ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          : <AlertCircle className="w-4 h-4 text-muted-foreground" />
                        }
                      </div>
                    )}
                  </div>

                  {/* Account + run info */}
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => navigate(`/accounts/${run.account}`)}
                      className="font-medium text-foreground hover:text-primary transition-colors truncate block"
                    >
                      {accountName(run.account)}
                    </button>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <StatusBadge status={run.status} />
                      <TriggerBadge type={run.trigger_type} />
                      {run.completed_at && (
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(run.completed_at), { addSuffix: true })}
                        </span>
                      )}
                      {run.status === 'running' && run.started_at && (
                        <span className="text-xs text-muted-foreground">
                          Started {formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Check counts */}
                  {run.status === 'completed' && (
                    <div className="hidden md:flex items-center gap-4 text-sm shrink-0">
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />{run.pass_count}
                      </span>
                      {run.warning_count > 0 && (
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="w-4 h-4" />{run.warning_count}
                        </span>
                      )}
                      {run.critical_count > 0 && (
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <XCircle className="w-4 h-4" />{run.critical_count}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {run.status === 'running' || run.status === 'queued' ? (
                      <button
                        onClick={() => navigate(`/audit/${run.id}/running`)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
                      >
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        Live
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRunAudit(run.account)}
                        className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-md text-xs font-medium hover:bg-muted transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        Re-run
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/accounts/${run.account}`)}
                      className="p-1.5 hover:bg-muted rounded-md transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
