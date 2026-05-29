import { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Copy,
  RefreshCw,
  Plus,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { AppShell } from '../components/AppShell';
import { HealthScoreRing } from '../components/HealthScoreRing';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
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
import type { Report, MonitoredAccount } from '../../lib/types';

// ── Status badge ──────────────────────────────────────────────────────────────

function ReportStatusBadge({ status }: { status: Report['status'] }) {
  if (status === 'generating') {
    return (
      <Badge className="gap-1 bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
        <Loader2 className="w-3 h-3 animate-spin" />
        Generating
      </Badge>
    );
  }
  if (status === 'ready') {
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
        <CheckCircle2 className="w-3 h-3" />
        Ready
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
      <XCircle className="w-3 h-3" />
      Error
    </Badge>
  );
}

// ── Generate report dialog ────────────────────────────────────────────────────

interface GenerateDialogProps {
  open: boolean;
  onClose: () => void;
  accounts: MonitoredAccount[];
  wsId: string;
  onGenerated: () => void;
}

function GenerateReportDialog({ open, onClose, accounts, wsId, onGenerated }: GenerateDialogProps) {
  const [accountId, setAccountId] = useState('');
  const [expiresDays, setExpiresDays] = useState<number | ''>(30);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (!submitting) {
      setAccountId('');
      setExpiresDays(30);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;
    setSubmitting(true);
    try {
      await api.reports.generate(wsId, {
        account_id: accountId,
        share_link_expires_days: expiresDays !== '' ? expiresDays : undefined,
      });
      toast.success('Report generation started', {
        description: 'Your PDF report will be ready shortly.',
      });
      onGenerated();
      handleClose();
    } catch {
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === accountId);

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            Generate Report
          </DialogTitle>
          <DialogDescription>
            Create a shareable PDF audit report for a monitored account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* Account select */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Account <span className="text-destructive">*</span>
            </label>
            <Select value={accountId} onValueChange={setAccountId} disabled={submitting}>
              <SelectTrigger className={!accountId ? 'text-muted-foreground' : ''}>
                <SelectValue placeholder="Select an account…" />
              </SelectTrigger>
              <SelectContent>
                {accounts.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No accounts available
                  </div>
                ) : (
                  accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center gap-2">
                        <span>{a.account_name}</span>
                        {a.latest_health_score !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            ({a.latest_health_score}%)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedAccount && (
              <p className="text-xs text-muted-foreground">
                Customer ID: {selectedAccount.google_ads_customer_id}
              </p>
            )}
          </div>

          {/* Expires in days */}
          <div className="space-y-2">
            <label htmlFor="expires-days" className="text-sm font-medium text-foreground">
              Share link expires in (days)
            </label>
            <Input
              id="expires-days"
              type="number"
              min={1}
              max={365}
              placeholder="30"
              value={expiresDays}
              onChange={e => setExpiresDays(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank for no expiry. Default is 30 days.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!accountId || submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Report
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────

interface ReportCardProps {
  report: Report;
  wsId: string;
  onRegenerate: () => void;
}

function ReportCard({ report, wsId, onRegenerate }: ReportCardProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [copying, setCopying] = useState(false);

  const isReady = report.status === 'ready';
  const isGenerating = report.status === 'generating';
  const isError = report.status === 'failed';

  const daysUntilExpiry = report.share_link_expires_at
    ? differenceInDays(new Date(report.share_link_expires_at), new Date())
    : null;

  const expiryLabel = daysUntilExpiry !== null
    ? daysUntilExpiry <= 0
      ? 'Link expired'
      : daysUntilExpiry === 1
        ? 'Expires tomorrow'
        : `Expires in ${daysUntilExpiry}d`
    : null;

  const handleDownload = () => {
    if (isReady && report.pdf_url) {
      window.open(report.pdf_url, '_blank');
    }
  };

  const handleCopyLink = async () => {
    const url = report.share_url
      ? (report.share_url.startsWith('http') ? report.share_url : `${window.location.origin}${report.share_url}`)
      : '';
    if (!url) {
      toast.error('No share link available yet.');
      return;
    }
    setCopying(true);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied!', { description: 'Link copied to clipboard.' });
    } catch {
      toast.error('Could not copy link. Please try manually.');
    } finally {
      setTimeout(() => setCopying(false), 1500);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await api.reports.generate(wsId, { account_id: report.account });
      toast.success('Regenerating report…', { description: 'A fresh report is being generated.' });
      onRegenerate();
    } catch {
      toast.error('Failed to regenerate. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`
        relative bg-card border border-border rounded-2xl overflow-hidden
        hover:shadow-md hover:shadow-black/5 hover:border-border/80
        transition-all duration-200 flex flex-col
        ${isGenerating ? 'animate-pulse-subtle' : ''}
      `}
    >
      {/* Top gradient strip */}
      <div className={`h-1 w-full ${
        isReady ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
        : isGenerating ? 'bg-gradient-to-r from-blue-500 to-blue-400'
        : 'bg-gradient-to-r from-red-500 to-red-400'
      }`} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header: account + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate text-sm leading-snug">
              {report.account_name}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 shrink-0" />
              <span>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
            </div>
          </div>
          <ReportStatusBadge status={report.status} />
        </div>

        {/* Health score ring (centered) */}
        <div className="flex justify-center items-center py-3">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-[60px] h-[60px]">
                <div className="absolute inset-0 rounded-full border-4 border-muted" />
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              </div>
              <p className="text-xs text-muted-foreground">Generating…</p>
            </div>
          ) : (
            <HealthScoreRing
              score={isReady && report.share_token ? 75 : 0}
              size="sm"
            />
          )}
        </div>

        {/* Expiry info */}
        {expiryLabel && !isGenerating && (
          <div className={`
            flex items-center gap-1.5 text-xs rounded-lg px-3 py-2 border
            ${daysUntilExpiry !== null && daysUntilExpiry <= 0
              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900'
              : daysUntilExpiry !== null && daysUntilExpiry <= 7
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900'
                : 'bg-muted/50 text-muted-foreground border-border'}
          `}>
            <Clock className="w-3 h-3 shrink-0" />
            <span>{expiryLabel}</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="space-y-2 pt-1 border-t border-border/60">
          {/* Download PDF */}
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 h-8 text-xs"
            disabled={!isReady || !report.pdf_url}
            onClick={handleDownload}
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </Button>

          {/* Copy share link + Regenerate row */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className={`flex-1 gap-1.5 h-8 text-xs transition-colors ${
                copying ? 'border-emerald-400 text-emerald-700 dark:text-emerald-400' : ''
              }`}
              onClick={handleCopyLink}
              disabled={!isReady || copying}
            >
              {copying ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Share link
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className={`gap-1.5 h-8 px-3 text-xs ${
                isError
                  ? 'border-red-300 text-red-700 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20'
                  : ''
              }`}
              onClick={handleRegenerate}
              disabled={regenerating || isGenerating}
              title="Regenerate report"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              {isError ? 'Retry' : ''}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ReportCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="h-1 bg-muted" />
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex justify-center py-3">
          <Skeleton className="w-[60px] h-[60px] rounded-full" />
        </div>
        <div className="space-y-2 pt-2 border-t border-border/60">
          <Skeleton className="h-8 w-full rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1 rounded-md" />
            <Skeleton className="h-8 w-10 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
          <FileText className="w-12 h-12 text-primary/60" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
          <Plus className="w-4 h-4 text-white" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">No reports yet</h3>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed mb-8">
        Generate a shareable PDF audit report for any of your monitored accounts.
      </p>
      <Button
        onClick={onGenerate}
        className="gap-2 shadow-sm"
        size="lg"
      >
        <Sparkles className="w-4 h-4" />
        Generate your first report
      </Button>
    </motion.div>
  );
}

// ── No-match state ────────────────────────────────────────────────────────────

function NoMatchState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <Search className="w-10 h-10 text-muted-foreground/40 mb-4" />
      <p className="font-medium text-foreground mb-1">No reports match your search</p>
      <p className="text-sm text-muted-foreground">Try a different search term or status filter.</p>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const { workspace } = useAuth();
  const wsId = workspace?.id ?? '';

  const [showDialog, setShowDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Report['status'] | 'all'>('all');

  const {
    data: reportsData,
    isLoading: loadingReports,
    refetch: refetchReports,
  } = useApi(
    () => wsId
      ? api.reports.list(wsId)
      : Promise.resolve({ count: 0, next: null, previous: null, results: [] as Report[] }),
    [wsId],
  );

  const { data: accountsData } = useApi(
    () => wsId
      ? api.accounts.list(wsId)
      : Promise.resolve({ count: 0, next: null, previous: null, results: [] as MonitoredAccount[] }),
    [wsId],
  );

  const reports: Report[] = reportsData?.results ?? [];
  const accounts: MonitoredAccount[] = accountsData?.results ?? [];

  const filtered = useMemo(() => {
    return reports.filter(r => {
      const matchesSearch = (r.account_name ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, search, statusFilter]);

  const generatingCount = reports.filter(r => r.status === 'generating').length;
  const readyCount = reports.filter(r => r.status === 'ready').length;

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-7">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Reports</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Generate and share PDF audit reports with your clients.</span>
              {reports.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="font-medium text-foreground">{readyCount}</span> ready
                  {generatingCount > 0 && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="font-medium text-blue-600 dark:text-blue-400">{generatingCount}</span> generating
                    </>
                  )}
                </span>
              )}
            </div>
          </div>

          <Button
            onClick={() => setShowDialog(true)}
            className="gap-2 shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Generate Report
          </Button>
        </div>

        {/* ── Filter bar ── */}
        {(reports.length > 0 || search || statusFilter !== 'all') && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9 text-sm"
                placeholder="Search by account name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as Report['status'] | 'all')}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="generating">Generating</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="failed">Error</SelectItem>
              </SelectContent>
            </Select>

            {/* Count */}
            {!loadingReports && (
              <span className="text-sm text-muted-foreground ml-auto shrink-0">
                {filtered.length} {filtered.length === 1 ? 'report' : 'reports'}
              </span>
            )}
          </div>
        )}

        {/* ── Content ── */}
        {loadingReports ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <ReportCardSkeleton key={i} />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <EmptyState onGenerate={() => setShowDialog(true)} />
        ) : filtered.length === 0 ? (
          <NoMatchState />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(report => (
                <ReportCard
                  key={report.id}
                  report={report}
                  wsId={wsId}
                  onRegenerate={refetchReports}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* ── Generate dialog ── */}
      <GenerateReportDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        accounts={accounts}
        wsId={wsId}
        onGenerated={refetchReports}
      />
    </AppShell>
  );
}
