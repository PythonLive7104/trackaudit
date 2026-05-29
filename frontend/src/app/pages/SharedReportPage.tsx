import { useParams } from 'react-router';
import { Download, Loader2, FileText, AlertTriangle, Search } from 'lucide-react';
import { format } from 'date-fns';
import { SEO } from '../../components/SEO';
import { buildTitle, SITE_URL } from '../../lib/seo';

import { HealthScoreRing } from '../components/HealthScoreRing';
import { Button } from '../components/ui/button';

import { api } from '../../lib/api';
import { useApi } from '../../hooks/useApi';

// ── Shared Report Page (public, no auth) ─────────────────────────────────────

export function SharedReportPage() {
  const { token = '' } = useParams<{ token: string }>();

  const { data: report, isLoading, error } = useApi(
    () => token ? api.reports.share(token) : Promise.reject({ status: 404 }),
    [token],
  );

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Loading report…</p>
        </div>
      </div>
    );
  }

  // ── Error states ──────────────────────────────────────────────────────────

  if (error || !report) {
    // Try to detect 410 (expired) vs 404 (not found) from error shape
    const errorStatus = (error as unknown as { status?: number } | null)?.status;
    const linkExpired =
      report?.share_link_expires_at
        ? new Date(report.share_link_expires_at) < new Date()
        : false;
    const isExpired = errorStatus === 410 || linkExpired;

    if (isExpired) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Link Expired</h1>
            <p className="text-muted-foreground">
              This report share link has expired. Please contact the agency for an updated link.
            </p>
            <p className="text-xs text-muted-foreground">HTTP 410 Gone</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Report Not Found</h1>
          <p className="text-muted-foreground">
            This report link is invalid or the report no longer exists.
          </p>
          <p className="text-xs text-muted-foreground">HTTP 404 Not Found</p>
        </div>
      </div>
    );
  }

  const isReady = report.status === 'ready';
  const isGenerating = report.status === 'generating';

  // Format dates
  const createdDate = format(new Date(report.created_at), 'MMMM d, yyyy');

  // ── Full report view ──────────────────────────────────────────────────────

  const reportTitle = buildTitle(`${report.account_name} — Google Ads Audit Report`);
  const reportDescription = `Google Ads conversion tracking audit report for ${report.account_name}. Generated on ${createdDate}. Health score: ${report.health_score ?? 'N/A'}/100.`;
  const reportSchema = {
    '@context': 'https://schema.org',
    '@type': 'Report',
    name: reportTitle,
    description: reportDescription,
    dateCreated: report.created_at,
    author: { '@type': 'Organization', name: 'TrackAudit', url: SITE_URL },
  };

  return (
    <>
      <SEO
        title={reportTitle}
        description={reportDescription}
        canonical={`${SITE_URL}/reports/share/${token}`}
        noindex
        jsonLd={reportSchema}
      />
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white dark:bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          {/* Agency logo / TrackAudit logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                TrackAudit Report
              </p>
              <p className="font-semibold text-foreground">{report.account_name}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground hidden sm:block">{createdDate}</p>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        {/* Health Score section */}
        <section className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-lg font-semibold text-muted-foreground uppercase tracking-wide">
            Overall Health Score
          </h2>

          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <p className="text-muted-foreground">Report is being generated…</p>
            </div>
          ) : (
            <HealthScoreRing score={75} size="lg" />
          )}

          <p className="text-muted-foreground text-sm max-w-xs">
            Score out of 100. Reflects conversion tracking health across your Google Ads account.
          </p>
        </section>

        {/* Status banner */}
        <section className="bg-card border border-border rounded-xl px-6 py-4 flex items-center gap-4">
          {isReady ? (
            <>
              <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Report ready</p>
                <p className="text-sm text-muted-foreground">
                  Generated on {createdDate}
                  {report.generated_by_name ? ` by ${report.generated_by_name}` : ''}.
                </p>
              </div>
            </>
          ) : isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
              <div>
                <p className="font-medium text-foreground">Generating…</p>
                <p className="text-sm text-muted-foreground">
                  This report is currently being prepared. Please check back shortly.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Report failed</p>
                <p className="text-sm text-muted-foreground">
                  Something went wrong while generating this report.
                </p>
              </div>
            </>
          )}
        </section>

        {/* Download */}
        {isReady && report.pdf_url && (
          <section className="flex justify-center">
            <Button
              size="lg"
              onClick={() => window.open(report.pdf_url, '_blank')}
            >
              <Download className="w-5 h-5" />
              Download PDF Report
            </Button>
          </section>
        )}

        {/* Expiry notice */}
        {report.share_link_expires_at && (
          <p className="text-center text-xs text-muted-foreground">
            This link expires on{' '}
            {format(new Date(report.share_link_expires_at), 'MMMM d, yyyy')}.
          </p>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <p className="text-center text-xs text-muted-foreground">
          Powered by{' '}
          <span className="font-semibold text-foreground">TrackAudit</span>
        </p>
      </footer>
    </div>
    </>
  );
}
