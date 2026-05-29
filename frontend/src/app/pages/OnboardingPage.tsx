import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Chrome,
  CheckCircle2,
  Search,
  ChevronRight,
  Building2,
  Loader2,
  AlertCircle,
  Sparkles,
  Zap,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import type { DiscoveredAccount, AuditRun, AuditCheck, MonitoredAccount } from '../../lib/types';
import { HealthScoreRing } from '../components/HealthScoreRing';

// ── Constants ──────────────────────────────────────────────────────────────────

const AUDIT_LOG_LINES = [
  'Validating Consent Mode signals...',
  'Checking conversion actions...',
  'Analysing enhanced conversions...',
  'Inspecting conversion windows...',
  'Calculating health score...',
  'Audit complete!',
];

const AUDIT_TIPS = [
  'Tip: Consent Mode v2 is required for all EU advertisers since March 2024.',
  'Tip: Enhanced conversions can recover 15–30% of lost conversion data.',
  'Tip: Conversion windows above 90 days improve attribution accuracy.',
  'Tip: Duplicate conversion actions silently inflate your reported conversions.',
  'Tip: Smart bidding performs best with 30+ conversions per month per campaign.',
];

const STEPS = ['Connect Google Account', 'Select Accounts', 'Running First Audit', 'Health Report'];

// ── Step Indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < current;
        const isActive = stepNum === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground',
                ].join(' ')}
              >
                {isDone ? <CheckCircle2 className="size-4" /> : stepNum}
              </div>
              <span
                className={[
                  'text-xs font-medium whitespace-nowrap hidden sm:block',
                  isActive ? 'text-foreground' : 'text-muted-foreground',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={[
                  'h-px w-12 sm:w-20 mb-4 transition-colors duration-300',
                  isDone ? 'bg-emerald-500' : 'bg-border',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Connect Google Account ────────────────────────────────────────────

function Step1Connect({
  wsId,
  connectionId,
  onConnected,
}: {
  wsId: string;
  connectionId: string | null;
  onConnected: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!wsId) return;
    setLoading(true);
    setError(null);
    try {
      const { auth_url } = await api.integrations.googleAds.authUrl(wsId);
      window.location.href = auth_url;
    } catch {
      setError('Failed to generate Google OAuth URL. Please try again.');
      setLoading(false);
    }
  };

  if (connectionId) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center gap-6"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle2 className="size-10 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Google OAuth Connected</h2>
          <p className="text-muted-foreground max-w-sm">
            Your Google account has been successfully connected. Let's now choose which Google Ads
            accounts you'd like to monitor.
          </p>
        </div>
        <Button size="lg" onClick={onConnected} className="gap-2">
          Select Accounts <ChevronRight className="size-4" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center gap-8 max-w-lg mx-auto"
    >
      {/* Brand mark */}
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="size-8 text-primary" />
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-foreground mb-3">Connect Your Google Ads Account</h2>
        <p className="text-muted-foreground text-base leading-relaxed">
          TrackAudit needs read-only access to your Google Ads data to analyse your conversion
          tracking setup and surface actionable issues.
        </p>
      </div>

      {/* Permissions list */}
      <div className="w-full bg-muted/40 rounded-xl p-5 text-left space-y-3">
        <p className="text-sm font-semibold text-foreground mb-1">We request access to:</p>
        {[
          'View your Google Ads accounts and campaigns',
          'Read conversion tracking settings and actions',
          'Check consent mode and tag health signals',
          'Inspect billing and performance data (read-only)',
        ].map((item) => (
          <div key={item} className="flex items-start gap-2.5">
            <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
            <span className="text-sm text-muted-foreground">{item}</span>
          </div>
        ))}
      </div>

      {/* Security reassurance */}
      <div className="w-full border border-border rounded-xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
          <Lock className="size-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">Your credentials are safe</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            We never store your Google password. Access is read-only via OAuth 2.0 — you can revoke
            it at any time from your Google account security settings.
          </p>
        </div>
      </div>

      {error && (
        <div className="w-full flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-3 text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        size="lg"
        onClick={handleConnect}
        disabled={loading || !wsId}
        className="w-full max-w-xs gap-2 h-12 text-base"
      >
        {loading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Chrome className="size-5" />
        )}
        {loading ? 'Redirecting…' : 'Connect Google Ads'}
      </Button>

      <p className="text-xs text-muted-foreground">
        By connecting, you agree to our{' '}
        <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Privacy Policy
        </a>
        .
      </p>
    </motion.div>
  );
}

// ── Step 2: Select Accounts ────────────────────────────────────────────────────

function Step2SelectAccounts({
  wsId,
  connectionId,
  onComplete,
}: {
  wsId: string;
  connectionId: string;
  onComplete: (accounts: MonitoredAccount[]) => void;
}) {
  const [accounts, setAccounts] = useState<DiscoveredAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.integrations.googleAds
      .discover(wsId, connectionId)
      .then((data) => {
        if (!cancelled) {
          setAccounts(data);
          // Pre-select accounts that aren't already added
          const autoSelect = data
            .filter((a) => !a.already_added)
            .map((a) => a.customer_id);
          setSelected(new Set(autoSelect));
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to discover accounts. Please go back and reconnect.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wsId, connectionId]);

  const filtered = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.customer_id.includes(query),
  );

  const toggleAccount = (id: string, alreadyAdded: boolean) => {
    if (alreadyAdded) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleContinue = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.accounts.create(wsId, {
        connection_id: connectionId,
        customer_ids: Array.from(selected),
      });
      onComplete(created);
    } catch {
      setError('Failed to add accounts. Please try again.');
      setSubmitting(false);
    }
  };

  const newlySelected = Array.from(selected).filter(
    (id) => !accounts.find((a) => a.customer_id === id)?.already_added,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6 w-full max-w-2xl mx-auto"
    >
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Select Google Ads Accounts</h2>
        <p className="text-muted-foreground text-sm">
          Choose the accounts you want TrackAudit to monitor. You can add more later.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or customer ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Discovering accounts…</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-2 py-12 text-destructive text-sm">
            <AlertCircle className="size-4" />
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            {query ? 'No accounts match your search.' : 'No accounts found for this connection.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="w-10 py-3 px-4 text-left text-muted-foreground font-medium" />
                <th className="py-3 px-4 text-left text-muted-foreground font-medium">Account</th>
                <th className="py-3 px-4 text-left text-muted-foreground font-medium hidden sm:table-cell">
                  Customer ID
                </th>
                <th className="py-3 px-4 text-left text-muted-foreground font-medium hidden md:table-cell">
                  Currency
                </th>
                <th className="py-3 px-4 text-left text-muted-foreground font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((account, idx) => {
                const isSelected = selected.has(account.customer_id) || account.already_added;
                const isDisabled = account.already_added;
                return (
                  <tr
                    key={account.customer_id}
                    onClick={() => toggleAccount(account.customer_id, isDisabled)}
                    className={[
                      'border-b last:border-b-0 transition-colors',
                      isDisabled
                        ? 'opacity-60 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-accent/50',
                      idx % 2 === 0 ? 'bg-background' : 'bg-muted/20',
                    ].join(' ')}
                  >
                    <td className="py-3 px-4">
                      <div
                        className={[
                          'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-border bg-background',
                        ].join(' ')}
                      >
                        {isSelected && (
                          <CheckCircle2 className="size-3.5 text-primary-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground">{account.name}</span>
                        {account.already_added && (
                          <Badge variant="secondary" className="text-xs">
                            Added
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell font-mono text-xs">
                      {account.customer_id}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                      {account.currency_code}
                    </td>
                    <td className="py-3 px-4">
                      {account.is_manager ? (
                        <Badge variant="outline" className="text-xs">
                          Manager
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Standard
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Selection summary */}
      {newlySelected.length > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{newlySelected.length}</span>{' '}
          account{newlySelected.length !== 1 ? 's' : ''} selected
        </p>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-3 text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        size="lg"
        onClick={handleContinue}
        disabled={newlySelected.length === 0 || submitting || loading}
        className="w-full gap-2"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ChevronRight className="size-4" />
        )}
        {submitting ? 'Adding accounts…' : 'Continue'}
      </Button>
    </motion.div>
  );
}

// ── Step 3: Running First Audit ───────────────────────────────────────────────

function Step3RunningAudit({
  wsId,
  accountId,
  onComplete,
}: {
  wsId: string;
  accountId: string;
  onComplete: (run: AuditRun) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [tipIndex, setTipIndex] = useState(0);
  const [runId, setRunId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const completedRef = useRef(false);

  // Start audit on mount
  useEffect(() => {
    let cancelled = false;
    api.audits
      .run(wsId, accountId)
      .then((run) => {
        if (!cancelled) setRunId(run.id);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [wsId, accountId]);

  // Animated progress bar 0→100 over ~5s
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Log lines revealed one by one every ~600ms
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    AUDIT_LOG_LINES.forEach((line, i) => {
      timers.push(
        setTimeout(() => {
          setLogLines((prev) => [...prev, line]);
        }, i * 600),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Rotate tips every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % AUDIT_TIPS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Poll audit status every 2s
  useEffect(() => {
    if (!runId) return;
    const poll = setInterval(async () => {
      if (completedRef.current) return;
      try {
        const run = await api.audits.get(wsId, runId);
        if (run.status === 'completed') {
          completedRef.current = true;
          clearInterval(poll);
          setProgress(100);
          setTimeout(() => onComplete(run), 600);
        } else if (run.status === 'failed') {
          completedRef.current = true;
          clearInterval(poll);
          setFailed(true);
        }
      } catch {
        // ignore transient errors
      }
    }, 2000);
    return () => clearInterval(poll);
  }, [wsId, runId, onComplete]);

  const progressColor =
    progress < 40 ? 'bg-blue-500' : progress < 75 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8 w-full max-w-lg mx-auto"
    >
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Zap className="size-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Running Your First Audit</h2>
        <p className="text-muted-foreground text-sm">
          We're analysing your Google Ads account for conversion tracking issues.
        </p>
      </div>

      {failed ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-4 text-sm w-full">
            <AlertCircle className="size-4 shrink-0" />
            The audit failed to complete. This may be due to a temporary issue — please try again.
          </div>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Audit progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${progressColor} transition-colors duration-500`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Live log */}
          <div className="bg-muted/40 rounded-xl p-4 font-mono text-xs space-y-1.5 min-h-[160px]">
            <AnimatePresence>
              {logLines.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className={[
                    'flex items-center gap-2',
                    i === logLines.length - 1 ? 'text-foreground' : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {i === logLines.length - 1 && progress < 100 ? (
                    <Loader2 className="size-3 animate-spin shrink-0 text-primary" />
                  ) : (
                    <CheckCircle2 className="size-3 shrink-0 text-emerald-500" />
                  )}
                  {line}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Rotating tip */}
          <div className="border border-border rounded-xl p-4 bg-card min-h-[60px] flex items-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="text-xs text-muted-foreground italic"
              >
                {AUDIT_TIPS[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ── Step 4: Health Report ──────────────────────────────────────────────────────

function Step4HealthReport({
  wsId,
  auditRun,
  onDone,
}: {
  wsId: string;
  auditRun: AuditRun;
  onDone: () => void;
}) {
  const [checks, setChecks] = useState<AuditCheck[]>([]);
  const [loadingChecks, setLoadingChecks] = useState(true);
  const [isTrialing, setIsTrialing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.audits.checks(wsId, auditRun.id),
      api.billing.subscription(wsId).catch(() => null),
    ]).then(([checksData, sub]) => {
      if (cancelled) return;
      setChecks(checksData);
      if (sub?.status === 'trialing') setIsTrialing(true);
      setLoadingChecks(false);
    });
    return () => {
      cancelled = true;
    };
  }, [wsId, auditRun.id]);

  const score = auditRun.health_score ?? 0;
  const criticalChecks = checks
    .filter((c) => c.severity === 'critical' || c.status === 'critical')
    .slice(0, 3);

  const getScoreLabel = (s: number) => {
    if (s >= 80) return { label: 'Excellent', color: 'text-emerald-500' };
    if (s >= 60) return { label: 'Needs Attention', color: 'text-amber-500' };
    return { label: 'Critical Issues Found', color: 'text-red-500' };
  };

  const scoreInfo = getScoreLabel(score);

  const severityStyles: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8 w-full max-w-lg mx-auto"
    >
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-1">Your First Audit is Complete</h2>
        <p className="text-muted-foreground text-sm">
          Here's how your account scored on conversion tracking health.
        </p>
      </div>

      {/* Health score ring */}
      <div className="flex flex-col items-center gap-3">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
        >
          <HealthScoreRing score={score} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <p className={`text-lg font-bold ${scoreInfo.color}`}>{scoreInfo.label}</p>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              {auditRun.pass_count} passing
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="size-3.5 text-amber-500" />
              {auditRun.warning_count} warnings
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle className="size-3.5 text-red-500" />
              {auditRun.critical_count} critical
            </span>
          </div>
        </motion.div>
      </div>

      {/* Top critical findings */}
      {!loadingChecks && criticalChecks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold text-foreground">Top Critical Findings</h3>
          {criticalChecks.map((check) => (
            <div
              key={check.id}
              className="border border-border rounded-xl p-4 bg-card space-y-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground leading-snug">
                  {check.check_name}
                </p>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0 ${
                    severityStyles[check.severity] ?? severityStyles.medium
                  }`}
                >
                  {check.severity}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {check.finding_summary}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Upgrade CTA if trialing */}
      {isTrialing && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="size-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">You're on a free trial</p>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                    Upgrade to unlock unlimited accounts, scheduled audits, and Slack alerts.
                  </p>
                  <Button size="sm" variant="default" className="gap-1.5">
                    Upgrade Plan <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Button size="lg" onClick={onDone} className="w-full gap-2">
        Go to Dashboard <ArrowRight className="size-4" />
      </Button>
    </motion.div>
  );
}

// ── Main OnboardingPage ───────────────────────────────────────────────────────

export function OnboardingPage() {
  const { workspace } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const wsId = workspace?.id ?? '';
  const connectionId = searchParams.get('connection_id');

  // Step: 1=connect, 2=select, 3=audit, 4=report
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [activeConnectionId] = useState<string | null>(connectionId);
  const [addedAccounts, setAddedAccounts] = useState<MonitoredAccount[]>([]);
  const [completedRun, setCompletedRun] = useState<AuditRun | null>(null);

  // If we land with a connection_id, advance to step 2 flow naturally via Step1 success state
  // The user clicks "Select Accounts" to advance to step 2
  const handleStep1Connected = useCallback(() => {
    setStep(2);
  }, []);

  const handleStep2Complete = useCallback((accounts: MonitoredAccount[]) => {
    setAddedAccounts(accounts);
    setStep(3);
  }, []);

  const handleStep3Complete = useCallback((run: AuditRun) => {
    setCompletedRun(run);
    setStep(4);
  }, []);

  const handleDone = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const firstAccount = addedAccounts[0];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <ShieldCheck className="size-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-foreground">TrackAudit</span>
        <div className="ml-auto">
          <Badge variant="outline" className="text-xs">
            Setup Wizard
          </Badge>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10">
        <div className="w-full max-w-2xl">
          <StepIndicator current={step} />

          <Card className="shadow-sm">
            <CardContent className="py-10 px-8">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Step1Connect
                      wsId={wsId}
                      connectionId={activeConnectionId}
                      onConnected={handleStep1Connected}
                    />
                  </motion.div>
                )}

                {step === 2 && activeConnectionId && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Step2SelectAccounts
                      wsId={wsId}
                      connectionId={activeConnectionId}
                      onComplete={handleStep2Complete}
                    />
                  </motion.div>
                )}

                {step === 3 && firstAccount && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Step3RunningAudit
                      wsId={wsId}
                      accountId={firstAccount.id}
                      onComplete={handleStep3Complete}
                    />
                  </motion.div>
                )}

                {step === 4 && completedRun && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Step4HealthReport
                      wsId={wsId}
                      auditRun={completedRun}
                      onDone={handleDone}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Need help?{' '}
            <a href="mailto:support@trackaudit.io" className="underline underline-offset-2 hover:text-foreground">
              Contact support
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
