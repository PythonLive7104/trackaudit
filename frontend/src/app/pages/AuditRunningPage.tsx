import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import type { AuditCheck, AuditRun, CheckStatus } from '../../lib/types';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';

// ── Audit tips ────────────────────────────────────────────────────────────────

const AUDIT_TIPS = [
  'Conversion tracking is the foundation of every high-performing Google Ads account.',
  'Duplicate conversion actions silently inflate your numbers and corrupt your bidding signals.',
  'Smart Bidding relies on accurate conversion data — bad data means wasted budget.',
  'Regularly auditing your tracking setup can uncover issues that hide for months.',
  'A healthy tracking setup means every click, call, and form submission is counted correctly.',
];

// ── Status icon for log lines ─────────────────────────────────────────────────

function CheckStatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
    case 'critical':
    case 'error':
    default:
      return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  }
}

// ── Log line ──────────────────────────────────────────────────────────────────

function LogLine({ check }: { check: AuditCheck }) {
  const ts = check.created_at
    ? formatDistanceToNow(new Date(check.created_at), { addSuffix: true, includeSeconds: true })
    : '';

  return (
    <div className="flex items-start gap-2.5 py-1.5 border-b border-border/40 last:border-0 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <CheckStatusIcon status={check.status} />
      <span className="flex-1 text-sm text-foreground font-medium leading-snug">{check.check_name}</span>
      <span className="text-xs text-muted-foreground shrink-0">{ts}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AuditRunningPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { workspace } = useAuth();
  const wsId = workspace?.id ?? '';

  // Poll state
  const [run, setRun] = useState<AuditRun | null>(null);
  const [checks, setChecks] = useState<AuditCheck[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fake progress (0→95 while running, jumps to 100 on complete)
  const [fakeProgress, setFakeProgress] = useState(0);

  // Tip rotation
  const [tipIndex, setTipIndex] = useState(0);

  // Countdown
  const [countdown, setCountdown] = useState(60);

  // Refs
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checksRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tipRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // ── Scroll log to bottom whenever checks update ───────────────────────────
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [checks.length]);

  // ── Start tip rotation ────────────────────────────────────────────────────
  useEffect(() => {
    tipRef.current = setInterval(() => {
      setTipIndex(i => (i + 1) % AUDIT_TIPS.length);
    }, 3000);
    return () => { if (tipRef.current) clearInterval(tipRef.current); };
  }, []);

  // ── Start countdown ───────────────────────────────────────────────────────
  useEffect(() => {
    countRef.current = setInterval(() => {
      setCountdown(c => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => { if (countRef.current) clearInterval(countRef.current); };
  }, []);

  // ── Fake progress ramp (0 → 95 over ~55 s) ───────────────────────────────
  useEffect(() => {
    progressRef.current = setInterval(() => {
      setFakeProgress(p => {
        if (p >= 95) {
          if (progressRef.current) clearInterval(progressRef.current);
          return 95;
        }
        // Slow down as we approach 95
        const step = p < 50 ? 2 : p < 80 ? 1 : 0.4;
        return Math.min(p + step, 95);
      });
    }, 800);
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, []);

  // ── Poll audit run status every 2 s ──────────────────────────────────────
  useEffect(() => {
    if (!wsId || !runId) return;

    const fetchRun = async () => {
      try {
        const data = await api.audits.get(wsId, runId);
        setRun(data);

        if (data.status === 'completed') {
          // Jump progress to 100
          if (progressRef.current) clearInterval(progressRef.current);
          setFakeProgress(100);
          // Stop polling
          if (pollRef.current) clearInterval(pollRef.current);
          if (checksRef.current) clearInterval(checksRef.current);
          // Navigate after short pause
          setTimeout(() => {
            navigate(`/accounts/${data.account}`);
          }, 1200);
        }

        if (data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (checksRef.current) clearInterval(checksRef.current);
          setError(data.failure_reason || 'The audit failed. Please try again.');
        }
      } catch (e: unknown) {
        setError((e as { data?: { detail?: string } })?.data?.detail ?? 'Failed to fetch audit status.');
      }
    };

    // Immediate first fetch
    fetchRun();
    pollRef.current = setInterval(fetchRun, 2000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [wsId, runId, navigate]);

  // ── Poll checks every 3 s to get live log feed ────────────────────────────
  useEffect(() => {
    if (!wsId || !runId) return;

    const fetchChecks = async () => {
      try {
        const data = await api.audits.checks(wsId, runId);
        setChecks(data);
      } catch {
        // Silently ignore — checks may not exist yet
      }
    };

    fetchChecks();
    checksRef.current = setInterval(fetchChecks, 3000);
    return () => { if (checksRef.current) clearInterval(checksRef.current); };
  }, [wsId, runId]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (checksRef.current) clearInterval(checksRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      if (tipRef.current) clearInterval(tipRef.current);
      if (countRef.current) clearInterval(countRef.current);
    };
  }, []);

  const isCompleted = run?.status === 'completed';
  const isFailed = run?.status === 'failed' || !!error;

  const handleRetry = async () => {
    if (!wsId || !run?.account) return;
    setError(null);
    setFakeProgress(0);
    setCountdown(60);
    try {
      const newRun = await api.audits.run(wsId, run.account);
      navigate(`/audit/${newRun.id}/running`);
    } catch (e: unknown) {
      setError((e as { data?: { detail?: string } })?.data?.detail ?? 'Failed to start a new audit.');
    }
  };

  return (
    <AppShell>
      <div className="max-w-[760px] mx-auto px-6 py-10 space-y-8">

        {/* ── Back / cancel ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel
          </button>
          {run?.account_name && (
            <p className="text-sm text-muted-foreground">{run.account_name}</p>
          )}
        </div>

        {/* ── Failed state ─────────────────────────────────────────────────── */}
        {isFailed && (
          <div className="bg-card border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Audit Failed</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {error ?? run?.failure_reason ?? 'An unexpected error occurred.'}
              </p>
            </div>
            <Button onClick={handleRetry} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Retry Audit
            </Button>
          </div>
        )}

        {/* ── Running / completed state ────────────────────────────────────── */}
        {!isFailed && (
          <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
            {/* Title + animated spinner */}
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-primary/10'}`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  {isCompleted ? 'Audit Complete!' : 'Running Audit…'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isCompleted
                    ? 'Redirecting to results…'
                    : 'Analysing your Google Ads account, please wait.'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {isCompleted
                    ? 'Done'
                    : run?.status === 'queued'
                      ? 'Queued…'
                      : `Scanning (${Math.round(fakeProgress)}%)`}
                </span>
                <span>
                  {!isCompleted && countdown > 0
                    ? `~${countdown}s remaining`
                    : isCompleted
                      ? '100%'
                      : 'Almost done…'}
                </span>
              </div>
              <Progress
                value={fakeProgress}
                className={`h-2.5 ${isCompleted ? '[&>[data-slot=progress-indicator]]:bg-emerald-500' : ''}`}
              />
            </div>

            {/* Stats row */}
            {checks.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Passed',   count: checks.filter(c => c.status === 'pass').length,     color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Warnings', count: checks.filter(c => c.status === 'warning').length,  color: 'text-amber-600 dark:text-amber-400' },
                  { label: 'Critical', count: checks.filter(c => c.status === 'critical' || c.status === 'error').length, color: 'text-red-600 dark:text-red-400' },
                ].map(s => (
                  <div key={s.label} className="bg-muted/50 rounded-xl px-4 py-3 text-center">
                    <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Live log feed */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Live Results
              </p>
              <div className="bg-background border border-border rounded-xl px-4 py-3 h-52 overflow-y-auto space-y-0">
                {checks.length === 0 ? (
                  <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Waiting for results…</span>
                  </div>
                ) : (
                  checks.map(check => (
                    <LogLine key={check.id} check={check} />
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* ── Rotating audit tips ─────────────────────────────────────────── */}
        {!isFailed && !isCompleted && (
          <div className="bg-card border border-border rounded-xl px-5 py-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                Did you know?
              </p>
              <p
                key={tipIndex}
                className="text-sm text-foreground leading-relaxed animate-in fade-in duration-500"
              >
                {AUDIT_TIPS[tipIndex]}
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
