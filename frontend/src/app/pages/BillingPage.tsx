import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  CreditCard, CheckCircle2, Zap, Building2,
  Download, ExternalLink, Crown, AlertTriangle,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
} from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { Skeleton } from '../components/ui/skeleton';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
import type { Plan, Subscription, Invoice } from '../../lib/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusVariant(
  status: Subscription['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'default';
    case 'past_due':
    case 'unpaid':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function invoiceStatusVariant(
  status: Invoice['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
      return 'default';
    case 'open':
      return 'outline';
    case 'void':
    case 'uncollectible':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function formatFrequency(minutes: number): string {
  if (minutes >= 1440) {
    const days = minutes / 1440;
    return days === 1 ? 'Daily' : `Every ${days} days`;
  }
  if (minutes >= 60) {
    const hours = minutes / 60;
    return hours === 12 ? 'Every 12h' : hours === 1 ? 'Hourly' : `Every ${hours}h`;
  }
  return `Every ${minutes} min`;
}

const TIER_META: Record<
  string,
  { icon: React.ReactNode; label: string; gradient: string }
> = {
  starter: {
    icon: <Zap className="w-5 h-5 text-blue-500" />,
    label: 'Starter',
    gradient: 'from-blue-500/10 to-transparent',
  },
  agency: {
    icon: <Building2 className="w-5 h-5 text-violet-500" />,
    label: 'Agency',
    gradient: 'from-violet-500/10 to-transparent',
  },
  agency_pro: {
    icon: <Crown className="w-5 h-5 text-amber-500" />,
    label: 'Agency Pro',
    gradient: 'from-amber-500/10 to-transparent',
  },
};

// ── Plan Card ──────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: Plan;
  isCurrent: boolean;
  hasActiveSub: boolean;
  checkoutLoading: string | null;
  onUpgrade: (plan: Plan) => void;
}

function PlanCard({ plan, isCurrent, hasActiveSub, checkoutLoading, onUpgrade }: PlanCardProps) {
  const meta = TIER_META[plan.tier] ?? { icon: <CreditCard className="w-5 h-5" />, gradient: '' };
  const isPopular = plan.tier === 'agency';
  const isLoading = checkoutLoading === plan.dodo_product_id;

  const ctaLabel = isCurrent
    ? 'Current Plan'
    : isLoading
    ? 'Redirecting…'
    : hasActiveSub
    ? 'Upgrade'
    : 'Get Started';

  return (
    <Card
      className={[
        'relative flex flex-col transition-shadow',
        isPopular ? 'ring-2 ring-primary shadow-lg shadow-primary/10' : '',
      ].join(' ')}
    >
      {isPopular && (
        <div className="absolute -top-3.5 inset-x-0 flex justify-center">
          <Badge className="px-4 py-1 text-xs font-semibold shadow-sm">Most Popular</Badge>
        </div>
      )}

      {/* Gradient accent strip */}
      <div className={`absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r ${meta.gradient}`} />

      <CardHeader className={isPopular ? 'pt-9' : 'pt-7'}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-lg bg-muted">{meta.icon}</div>
          <CardTitle className="text-base font-semibold">{plan.name}</CardTitle>
        </div>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-extrabold text-foreground tracking-tight">
            ${plan.price_dollars}
          </span>
          <span className="text-muted-foreground text-sm mb-1.5">
            / {plan.interval === 'annual' ? 'yr' : 'mo'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <Separator />
        <ul className="space-y-2.5 text-sm pt-1">
          <li className="flex items-start gap-2.5 text-foreground">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span><span className="font-semibold">{plan.max_accounts}</span> Google Ads accounts</span>
          </li>
          <li className="flex items-start gap-2.5 text-foreground">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span><span className="font-semibold">{plan.max_members}</span> team members</span>
          </li>
          <li className="flex items-start gap-2.5 text-foreground">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>Audits: <span className="font-semibold">{formatFrequency(plan.audit_frequency_minutes)}</span></span>
          </li>
          {plan.white_label_enabled && (
            <li className="flex items-start gap-2.5 text-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>White-label reports</span>
            </li>
          )}
        </ul>
      </CardContent>

      <CardFooter className="pt-4">
        <Button
          className="w-full"
          variant={isCurrent ? 'outline' : isPopular ? 'default' : 'outline'}
          disabled={isCurrent || isLoading}
          onClick={() => !isCurrent && onUpgrade(plan)}
        >
          {ctaLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function BillingPage() {
  const { workspace } = useAuth();
  const navigate = useNavigate();
  void navigate;
  const wsId = workspace?.id ?? '';

  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Handle ?success=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
      toast.success('Payment successful! Your subscription is now active.');
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Subscription — treat 404 as null (free plan)
  const { data: subscription, isLoading: loadingSub } = useApi<Subscription | null>(
    async () => {
      if (!wsId) return null;
      try {
        return await api.billing.subscription(wsId);
      } catch (e: unknown) {
        const err = e as { status?: number };
        if (err?.status === 404) return null;
        throw e;
      }
    },
    [wsId],
  );

  const { data: plansRaw, isLoading: loadingPlans } = useApi(
    () => api.billing.plans(),
    [],
  );

  const { data: invoicesData, isLoading: loadingInvoices } = useApi(
    () =>
      wsId
        ? api.billing.invoices(wsId)
        : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    [wsId],
  );

  // Real account count for usage bar
  const { data: accountsData } = useApi(
    () =>
      wsId
        ? api.accounts.list(wsId)
        : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    [wsId],
  );

  const plans: Plan[] = (plansRaw ?? []).filter(p => p.interval === billingInterval);
  const invoices: Invoice[] = invoicesData?.results ?? [];
  const hasActiveSub = subscription?.is_active ?? false;
  const currentPlan = subscription?.plan;
  const usedAccounts = accountsData?.count ?? 0;
  const maxAccounts = currentPlan?.max_accounts ?? 0;
  const usagePct = maxAccounts > 0 ? Math.min(100, Math.round((usedAccounts / maxAccounts) * 100)) : 0;

  // Tier order for consistent grid display
  const TIER_ORDER = ['starter', 'agency', 'agency_pro'];
  const sortedPlans = [...plans].sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier),
  );

const handleUpgrade = async (plan: Plan) => {
    if (!wsId) return;
    setCheckoutLoading(plan.dodo_product_id);
    try {
      const { checkout_url } = await api.billing.createCheckout(wsId, {
        dodo_product_id: plan.dodo_product_id,
        return_url: window.location.href,
      });
      window.location.href = checkout_url;
    } catch {
      toast.error('Could not start checkout. Please try again.');
      setCheckoutLoading(null);
    }
  };

  return (
    <AppShell accountCount={usedAccounts}>
      <div className="max-w-5xl mx-auto px-8 py-10 space-y-10">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Billing &amp; Plans</h1>
          <p className="text-muted-foreground">
            Manage your subscription, payment method, and invoice history.
          </p>
        </div>

        {/* ── Current Plan / Free Banner ───────────────────────────────────── */}
        {loadingSub ? (
          <Card>
            <CardContent className="py-8 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ) : hasActiveSub && currentPlan ? (
          <Card className="overflow-hidden">
            <div
              className={`h-1 w-full bg-gradient-to-r ${TIER_META[currentPlan.tier]?.gradient ?? ''}`}
            />
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-muted">
                    {TIER_META[currentPlan.tier]?.icon ?? <CreditCard className="w-5 h-5" />}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">{currentPlan.name}</CardTitle>
                    <CardDescription>
                      ${currentPlan.price_dollars} / {currentPlan.interval === 'annual' ? 'year' : 'month'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={statusVariant(subscription!.status)} className="capitalize">
                    {subscription!.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {subscription!.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  Renews on{' '}
                  <span className="font-semibold text-foreground">
                    {format(new Date(subscription!.current_period_end), 'MMMM d, yyyy')}
                  </span>
                </p>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Accounts used</span>
                  <span className="font-semibold text-foreground">
                    {usedAccounts} / {maxAccounts}
                  </span>
                </div>
                <Progress value={usagePct} className="h-2" />
                {usagePct >= 80 && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 pt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    You're approaching your account limit. Consider upgrading.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Free / no subscription banner */
          <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
            <CardContent className="py-8 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="p-4 rounded-2xl bg-primary/10 shrink-0">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-foreground mb-1">
                  You're on the free plan
                </p>
                <p className="text-sm text-muted-foreground">
                  Upgrade to unlock more accounts, team members, and advanced audit frequency.
                </p>
              </div>
              <Button
                className="shrink-0"
                onClick={() => {
                  document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                View Plans
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Plans Section ───────────────────────────────────────────────── */}
        <section id="plans-section" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {hasActiveSub ? 'Change Plan' : 'Choose a Plan'}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                All plans include a 14-day free trial.
              </p>
            </div>

            {/* Monthly / Annual toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {(['monthly', 'annual'] as const).map(iv => (
                <button
                  key={iv}
                  onClick={() => setBillingInterval(iv)}
                  className={[
                    'relative px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize',
                    billingInterval === iv
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {iv}
                  {iv === 'annual' && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      Save 20%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {loadingPlans ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[0, 1, 2].map(i => (
                <Card key={i} className="flex flex-col">
                  <CardContent className="py-8 space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-10 w-full mt-4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No plans available for this billing interval.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              {sortedPlans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrent={currentPlan?.id === plan.id && hasActiveSub}
                  hasActiveSub={hasActiveSub}
                  checkoutLoading={checkoutLoading}
                  onUpgrade={handleUpgrade}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Invoice History ──────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Invoice History</h2>
          <Card>
            {loadingInvoices ? (
              <CardContent className="py-10 space-y-3">
                {[0, 1, 2].map(i => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </CardContent>
            ) : invoices.length === 0 ? (
              <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
                <div className="p-4 rounded-2xl bg-muted">
                  <CreditCard className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="font-semibold text-foreground">No invoices yet</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Invoices will appear here after your first billing cycle.
                </p>
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Date', 'Period', 'Amount', 'Status', ''].map(h => (
                        <th
                          key={h}
                          className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 text-foreground font-medium">
                          {inv.paid_at
                            ? format(new Date(inv.paid_at), 'MMM d, yyyy')
                            : format(new Date(inv.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {inv.period_start && inv.period_end
                            ? `${format(new Date(inv.period_start), 'MMM d')} – ${format(new Date(inv.period_end), 'MMM d, yyyy')}`
                            : '—'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-foreground">
                          ${inv.amount_dollars.toFixed(2)}{' '}
                          <span className="text-xs font-normal text-muted-foreground uppercase">
                            {inv.currency}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={invoiceStatusVariant(inv.status)}
                            className={[
                              'capitalize',
                              inv.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0'
                                : '',
                            ].join(' ')}
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {inv.invoice_pdf_url && (
                            <a
                              href={inv.invoice_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
