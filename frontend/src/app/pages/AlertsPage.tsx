import React, { useState, useCallback } from 'react';
import {
  AlertTriangle,
  Info,
  Shield,
  ChevronLeft,
  ChevronRight,
  BellOff,
  CheckCheck,
  Clock,
  Zap,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { Alert, AlertSeverity, AlertStatus, MonitoredAccount } from '../../lib/types';

// ── Severity & status config ──────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<AlertSeverity, {
  border: string;
  bg: string;
  badgeClass: string;
  icon: React.ReactNode;
  label: string;
}> = {
  critical: {
    border: 'border-l-red-500',
    bg: 'bg-red-500/5',
    badgeClass: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    icon: <Zap className="w-3 h-3" />,
    label: 'Critical',
  },
  warning: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-500/5',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    icon: <AlertTriangle className="w-3 h-3" />,
    label: 'Warning',
  },
  info: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-500/5',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    icon: <Info className="w-3 h-3" />,
    label: 'Info',
  },
};

const STATUS_CONFIG: Record<AlertStatus, { badgeClass: string; label: string }> = {
  open: {
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
    label: 'Open',
  },
  snoozed: {
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    label: 'Snoozed',
  },
  resolved: {
    badgeClass: 'bg-muted text-muted-foreground border-border',
    label: 'Resolved',
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold ${cfg.badgeClass}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: AlertStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${cfg.badgeClass}`}>
      {cfg.label}
    </span>
  );
}

// ── Stats card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  accentClass: string;
  textClass: string;
  dotClass: string;
  onClick?: () => void;
  active?: boolean;
}

function StatCard({ label, value, accentClass, textClass, dotClass, onClick, active }: StatCardProps) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative overflow-hidden text-left w-full bg-card border rounded-xl p-5
        transition-all duration-200 cursor-pointer
        ${active
          ? 'border-primary/50 shadow-md shadow-primary/10 ring-1 ring-primary/20'
          : 'border-border hover:border-border/80 hover:shadow-sm'}
      `}
    >
      {/* Colored left accent bar */}
      <div className={`absolute left-0 inset-y-0 w-1 rounded-l-xl ${accentClass}`} />
      <div className="pl-2">
        <p className={`text-3xl font-bold tabular-nums ${textClass}`}>{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5 font-medium">{label}</p>
      </div>
      <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${dotClass}`} />
    </motion.button>
  );
}

// ── Resolve dialog ────────────────────────────────────────────────────────────

interface ResolveDialogProps {
  open: boolean;
  alert: Alert | null;
  onClose: () => void;
  onConfirm: (note: string) => Promise<void>;
}

function ResolveDialog({ open, alert, onClose, onConfirm }: ResolveDialogProps) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await onConfirm(note);
      setNote('');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setNote('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            Resolve Alert
          </DialogTitle>
        </DialogHeader>

        {alert && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground leading-snug">{alert.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{alert.account_name}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Resolution note <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                className="w-full h-24 rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none placeholder:text-muted-foreground"
                placeholder="What was the root cause? What action did you take?"
                value={note}
                onChange={e => setNote(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Resolving…
              </>
            ) : (
              <>
                <CheckCheck className="w-3.5 h-3.5" />
                Mark Resolved
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Alert card ────────────────────────────────────────────────────────────────

interface AlertCardProps {
  alert: Alert;
  onSnooze: (alertId: string, hours: number) => Promise<void>;
  onResolve: (alert: Alert) => void;
}

function AlertCard({ alert, onSnooze, onResolve }: AlertCardProps) {
  const [snoozing, setSnoozing] = useState(false);
  const cfg = SEVERITY_CONFIG[alert.severity];

  const handleSnooze = async (value: string) => {
    setSnoozing(true);
    try {
      await onSnooze(alert.id, Number(value));
    } finally {
      setSnoozing(false);
    }
  };

  const isActionable = alert.status !== 'resolved';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={`
        relative border-l-4 ${cfg.border} ${cfg.bg}
        bg-card border border-border rounded-xl p-4
        hover:shadow-sm transition-shadow duration-200
        group
      `}
    >
      <div className="flex gap-4 items-start">
        {/* Body */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Badges + time */}
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={alert.severity} />
            <StatusBadge status={alert.status} />
            {alert.status === 'snoozed' && alert.snoozed_until && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="w-3 h-3" />
                Until {new Date(alert.snoozed_until).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span className="ml-auto text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(alert.first_detected_at), { addSuffix: true })}
            </span>
          </div>

          {/* Title + account */}
          <div>
            <p className="font-semibold text-foreground text-sm leading-snug">{alert.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{alert.account_name}</p>
          </div>

          {/* Description */}
          {alert.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {alert.description}
            </p>
          )}
        </div>

        {/* Action buttons */}
        {isActionable && (
          <div className="flex items-center gap-2 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
            {/* Snooze dropdown */}
            <Select onValueChange={handleSnooze} disabled={snoozing}>
              <SelectTrigger
                size="sm"
                className="h-8 w-auto gap-1.5 text-xs border-dashed hover:border-solid transition-all"
              >
                <BellOff className="w-3 h-3" />
                <span>{snoozing ? 'Snoozing…' : 'Snooze'}</span>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="4">4 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="48">48 hours</SelectItem>
              </SelectContent>
            </Select>

            {/* Resolve button */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5 border-dashed hover:border-solid hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 dark:hover:border-emerald-700 transition-all"
              onClick={() => onResolve(alert)}
            >
              <CheckCheck className="w-3 h-3" />
              Resolve
            </Button>
          </div>
        )}
      </div>

      {/* Resolved info */}
      {alert.status === 'resolved' && alert.resolved_at && (
        <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Resolved {formatDistanceToNow(new Date(alert.resolved_at), { addSuffix: true })}</span>
          {alert.resolved_by_name && <span>by {alert.resolved_by_name}</span>}
          {alert.resolve_note && (
            <span className="ml-1 italic truncate max-w-xs">"…{alert.resolve_note.slice(0, 60)}"</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function AlertSkeleton() {
  return (
    <div className="border-l-4 border-l-muted bg-card border border-border rounded-xl p-4">
      <div className="flex gap-4">
        <div className="flex-1 space-y-2.5">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-14 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md ml-auto" />
          </div>
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/3 rounded" />
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-3 w-5/6 rounded" />
        </div>
        <div className="flex gap-2 shrink-0">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center">
          <Shield className="w-12 h-12 text-emerald-500" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <CheckCheck className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">
        {hasFilters ? 'No alerts match your filters' : 'All clear!'}
      </h3>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
        {hasFilters
          ? 'Try broadening your filters to see more results.'
          : 'Your accounts are looking healthy. No open alerts right now.'}
      </p>
    </motion.div>
  );
}

// ── Filter pill button ────────────────────────────────────────────────────────

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
  colorClass?: string;
}

function FilterPill({ label, active, onClick, colorClass }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
        ${active
          ? `${colorClass ?? 'bg-primary text-primary-foreground'} shadow-sm`
          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'}
      `}
    >
      {label}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export function AlertsPage() {
  const { workspace } = useAuth();
  const wsId = workspace?.id ?? '';

  // Filters
  const [severity, setSeverity] = useState<string>('all');
  const [status, setStatus] = useState<string>('open');
  const [accountId, setAccountId] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Resolve dialog
  const [resolveTarget, setResolveTarget] = useState<Alert | null>(null);

  // ── Fetches ───────────────────────────────────────────────────────────────

  const { data: statsData } = useApi(
    () => wsId
      ? api.alerts.stats(wsId)
      : Promise.resolve({ total_open: 0, critical: 0, warning: 0, info: 0 }),
    [wsId],
  );

  const { data: accountsData } = useApi(
    () => wsId
      ? api.accounts.list(wsId)
      : Promise.resolve({ count: 0, next: null, previous: null, results: [] as MonitoredAccount[] }),
    [wsId],
  );

  const filterParams = {
    ...(severity !== 'all' ? { severity } : {}),
    ...(status !== 'all' ? { status } : {}),
    ...(accountId !== 'all' ? { account_id: accountId } : {}),
  };

  const { data: alertsData, isLoading, refetch } = useApi(
    () => wsId
      ? api.alerts.list(wsId, filterParams)
      : Promise.resolve({ count: 0, next: null, previous: null, results: [] as Alert[] }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wsId, severity, status, accountId],
  );

  const stats = statsData ?? { total_open: 0, critical: 0, warning: 0, info: 0 };
  const alerts: Alert[] = alertsData?.results ?? [];
  const totalCount = alertsData?.count ?? 0;
  const accounts: MonitoredAccount[] = accountsData?.results ?? [];

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pagedAlerts = alerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = severity !== 'all' || status !== 'all' || accountId !== 'all';

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSnooze = useCallback(async (alertId: string, hours: number) => {
    if (!wsId) return;
    try {
      await api.alerts.snooze(wsId, alertId, { duration: `${hours}h` });
      toast.success(`Alert snoozed for ${hours} hour${hours !== 1 ? 's' : ''}`);
      refetch();
    } catch {
      toast.error('Failed to snooze alert. Please try again.');
    }
  }, [wsId, refetch]);

  const handleResolveConfirm = useCallback(async (note: string) => {
    if (!wsId || !resolveTarget) return;
    try {
      await api.alerts.resolve(wsId, resolveTarget.id, note);
      toast.success('Alert resolved successfully');
      setResolveTarget(null);
      refetch();
    } catch {
      toast.error('Failed to resolve alert. Please try again.');
    }
  }, [wsId, resolveTarget, refetch]);

  const handleSeverityFilter = (v: string) => { setSeverity(v); setPage(1); };
  const handleStatusChange = (v: string) => { setStatus(v); setPage(1); };
  const handleAccountChange = (v: string) => { setAccountId(v); setPage(1); };

  return (
    <AppShell alertCount={stats.total_open} accountCount={accounts.length}>
      <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-7">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Alert Center</h1>
              {stats.total_open > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white shadow-sm shadow-red-500/30">
                  {stats.total_open}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Monitor and resolve issues across your managed accounts.
            </p>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Critical"
            value={stats.critical}
            accentClass="bg-red-500"
            textClass="text-red-600 dark:text-red-400"
            dotClass="bg-red-500"
            active={severity === 'critical'}
            onClick={() => handleSeverityFilter(severity === 'critical' ? 'all' : 'critical')}
          />
          <StatCard
            label="Warning"
            value={stats.warning}
            accentClass="bg-amber-500"
            textClass="text-amber-600 dark:text-amber-400"
            dotClass="bg-amber-500"
            active={severity === 'warning'}
            onClick={() => handleSeverityFilter(severity === 'warning' ? 'all' : 'warning')}
          />
          <StatCard
            label="Info"
            value={stats.info}
            accentClass="bg-blue-500"
            textClass="text-blue-600 dark:text-blue-400"
            dotClass="bg-blue-500"
            active={severity === 'info'}
            onClick={() => handleSeverityFilter(severity === 'info' ? 'all' : 'info')}
          />
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Severity pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/40 border border-border">
            {(['all', 'critical', 'warning', 'info'] as const).map(sev => (
              <FilterPill
                key={sev}
                label={sev === 'all' ? 'All' : SEVERITY_CONFIG[sev].label}
                active={severity === sev}
                onClick={() => handleSeverityFilter(sev)}
                colorClass={sev === 'all'
                  ? 'bg-foreground text-background'
                  : sev === 'critical' ? 'bg-red-500 text-white'
                  : sev === 'warning' ? 'bg-amber-500 text-white'
                  : 'bg-blue-500 text-white'}
              />
            ))}
          </div>

          {/* Status select */}
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="snoozed">Snoozed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          {/* Account select */}
          {accounts.length > 0 && (
            <Select value={accountId} onValueChange={handleAccountChange}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Result count */}
          {!isLoading && (
            <span className="ml-auto text-sm text-muted-foreground shrink-0">
              {totalCount} {totalCount === 1 ? 'alert' : 'alerts'}
            </span>
          )}
        </div>

        {/* ── Alert feed ── */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <AlertSkeleton key={i} />
            ))}
          </div>
        ) : pagedAlerts.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {pagedAlerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onSnooze={handleSnooze}
                  onResolve={setResolveTarget}
                />
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* ── Pagination ── */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            <span className="text-sm text-muted-foreground min-w-[100px] text-center">
              Page {page} of {pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Resolve dialog ── */}
      <ResolveDialog
        open={resolveTarget !== null}
        alert={resolveTarget}
        onClose={() => setResolveTarget(null)}
        onConfirm={handleResolveConfirm}
      />
    </AppShell>
  );
}
