import { useState, useEffect } from 'react';
import {
  Loader2,
  Save,
  RotateCcw,
  Globe,
  Palette,
  Building2,
  ImageIcon,
  Sparkles,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';

import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
import type { WhiteLabelConfig } from '../../lib/types';

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: WhiteLabelConfig = {
  agency_name: '',
  logo_url: '',
  primary_color: '#6366f1',
  custom_domain: '',
  updated_at: '',
};

// ── Live Preview ──────────────────────────────────────────────────────────────

interface PreviewConfig {
  agency_name: string;
  logo_url: string;
  primary_color: string;
}

function ReportPreview({ config }: { config: PreviewConfig }) {
  const hasLogo = config.logo_url.trim() !== '';
  const agencyName = config.agency_name.trim() || 'Your Agency';
  const color = /^#[0-9a-fA-F]{6}$/.test(config.primary_color)
    ? config.primary_color
    : '#6366f1';

  // Compute a lighter shade for subtle accents
  const colorLight = color + '22';

  return (
    <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden select-none">
      {/* Top accent bar */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}99)` }} />

      <div className="p-5 space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasLogo ? (
              <img
                src={config.logo_url}
                alt="Agency logo preview"
                className="w-9 h-9 rounded-lg object-contain border border-border"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ background: color }}
              >
                {agencyName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground text-sm leading-tight">{agencyName}</p>
              <p className="text-xs text-muted-foreground">Google Ads Audit Report</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">May 2026</p>
            <p className="text-xs text-muted-foreground">Confidential</p>
          </div>
        </div>

        <Separator />

        {/* Account name skeleton */}
        <div className="space-y-1.5">
          <div className="h-2.5 bg-muted rounded-full w-2/5" />
          <div className="h-2 bg-muted/70 rounded-full w-1/3" />
        </div>

        {/* Score ring + findings */}
        <div className="flex items-center gap-5">
          {/* Health score ring */}
          <div className="relative shrink-0">
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="28" fill="none" stroke={colorLight} strokeWidth="6" />
              <circle
                cx="36" cy="36" r="28"
                fill="none"
                stroke={color}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 28 * 0.78} ${2 * Math.PI * 28}`}
                strokeDashoffset={0}
                transform="rotate(-90 36 36)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-bold text-base leading-none" style={{ color }}>85</span>
              <span className="text-[9px] text-muted-foreground mt-0.5">SCORE</span>
            </div>
          </div>

          {/* Metric pills */}
          <div className="flex-1 space-y-1.5">
            {[
              { label: 'Conversion Tracking', status: 'Pass', ok: true },
              { label: 'Bidding Strategy', status: 'Warning', ok: false },
              { label: 'Ad Quality Score', status: 'Pass', ok: true },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between gap-2">
                <div className="h-2 bg-muted rounded-full flex-1" />
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white shrink-0"
                  style={{ background: item.ok ? color : '#f59e0b' }}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { value: '12', label: 'Passed' },
            { value: '3', label: 'Warnings' },
            { value: '1', label: 'Critical' },
          ].map(stat => (
            <div
              key={stat.label}
              className="text-center p-2 rounded-lg"
              style={{ background: colorLight }}
            >
              <p className="font-bold text-sm" style={{ color }}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">Powered by TrackAudit</p>
          <p className="text-[10px] font-semibold" style={{ color }}>{agencyName}</p>
        </div>
      </div>
    </div>
  );
}

// ── Logo URL preview thumbnail ────────────────────────────────────────────────

function LogoPreview({ url }: { url: string }) {
  const [valid, setValid] = useState(false);
  const trimmed = url.trim();

  if (!trimmed) return null;

  return (
    <div className="mt-2 flex items-center gap-3">
      <img
        src={trimmed}
        alt="Logo preview"
        className="w-12 h-12 rounded-lg border border-border object-contain bg-muted"
        onLoad={() => setValid(true)}
        onError={() => setValid(false)}
        style={{ display: valid ? 'block' : 'none' }}
      />
      {!valid && (
        <div className="w-12 h-12 rounded-lg border border-dashed border-border bg-muted flex items-center justify-center">
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {valid ? 'Logo loaded successfully' : 'Enter a valid image URL to preview'}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type FormConfig = Omit<WhiteLabelConfig, 'updated_at'>;

export function WhiteLabelPage() {
  const { workspace } = useAuth();
  const wsId = workspace?.id ?? '';

  const { data: savedConfig, isLoading, refetch } = useApi(
    () =>
      wsId
        ? api.reports.whiteLabel(wsId)
        : Promise.resolve(DEFAULT_CONFIG),
    [wsId],
  );

  const [form, setForm] = useState<FormConfig>({
    agency_name: DEFAULT_CONFIG.agency_name,
    logo_url: DEFAULT_CONFIG.logo_url,
    primary_color: DEFAULT_CONFIG.primary_color,
    custom_domain: DEFAULT_CONFIG.custom_domain,
  });
  const [saving, setSaving] = useState(false);

  // Sync fetched config into form once loaded
  useEffect(() => {
    if (savedConfig) {
      setForm({
        agency_name: savedConfig.agency_name ?? '',
        logo_url: savedConfig.logo_url ?? '',
        primary_color: savedConfig.primary_color || '#6366f1',
        custom_domain: savedConfig.custom_domain ?? '',
      });
    }
  }, [savedConfig]);

  const handleChange = (field: keyof FormConfig, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsId) return;
    setSaving(true);
    try {
      await api.reports.updateWhiteLabel(wsId, form);
      toast.success('White-label settings saved', {
        description: 'Your branding will appear on all future reports.',
      });
      refetch();
    } catch {
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!savedConfig) return;
    setForm({
      agency_name: savedConfig.agency_name ?? '',
      logo_url: savedConfig.logo_url ?? '',
      primary_color: savedConfig.primary_color || '#6366f1',
      custom_domain: savedConfig.custom_domain ?? '',
    });
    toast.info('Reset to saved values');
  };

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">White Label</h1>
              <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800">
                <Sparkles className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Customise audit reports with your agency's branding before sharing with clients.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Loading your branding settings…</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

            {/* ── Form column ───────────────────────────────────────────────── */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              {/* Card header */}
              <div className="px-6 py-5 border-b border-border flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Palette className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Brand Configuration</h2>
                  <p className="text-xs text-muted-foreground">Customise your report appearance</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                {/* Agency Name */}
                <div className="space-y-2">
                  <Label htmlFor="agency-name" className="flex items-center gap-2 text-sm font-medium">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    Agency Name
                  </Label>
                  <Input
                    id="agency-name"
                    placeholder="Acme Marketing Agency"
                    value={form.agency_name}
                    onChange={e => handleChange('agency_name', e.target.value)}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Appears on report covers, footers, and client-facing pages.
                  </p>
                </div>

                {/* Logo URL */}
                <div className="space-y-2">
                  <Label htmlFor="logo-url" className="flex items-center gap-2 text-sm font-medium">
                    <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    Logo URL
                  </Label>
                  <Input
                    id="logo-url"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={form.logo_url}
                    onChange={e => handleChange('logo_url', e.target.value)}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Direct link to a PNG or SVG image. Recommended: 200×200 px or larger.
                  </p>
                  <LogoPreview url={form.logo_url} />
                </div>

                <Separator />

                {/* Primary Color */}
                <div className="space-y-2">
                  <Label htmlFor="primary-color-hex" className="flex items-center gap-2 text-sm font-medium">
                    <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                    Primary Color
                  </Label>
                  <div className="flex items-center gap-3">
                    {/* Native color picker */}
                    <label
                      htmlFor="primary-color-picker"
                      className="relative cursor-pointer shrink-0"
                    >
                      <input
                        id="primary-color-picker"
                        type="color"
                        value={form.primary_color}
                        onChange={e => handleChange('primary_color', e.target.value)}
                        className="sr-only"
                      />
                      <div
                        className="w-10 h-10 rounded-lg border-2 border-border shadow-sm transition-transform hover:scale-105"
                        style={{ background: form.primary_color }}
                      />
                    </label>
                    <Input
                      id="primary-color-hex"
                      value={form.primary_color}
                      onChange={e => {
                        const v = e.target.value;
                        handleChange('primary_color', v);
                      }}
                      placeholder="#6366f1"
                      className="font-mono h-10 flex-1"
                      maxLength={7}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used for headings, score rings, and accent elements in your reports.
                  </p>
                </div>

                <Separator />

                {/* Custom Domain */}
                <div className="space-y-2">
                  <Label htmlFor="custom-domain" className="flex items-center gap-2 text-sm font-medium">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    Custom Domain
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none select-none">
                      https://
                    </div>
                    <Input
                      id="custom-domain"
                      placeholder="reports.youragency.com"
                      value={form.custom_domain}
                      onChange={e => handleChange('custom_domain', e.target.value)}
                      className="h-10 pl-[4.5rem]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Point your CNAME to{' '}
                    <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">
                      app.trackaudit.io
                    </code>{' '}
                    then enter your subdomain here.
                  </p>
                </div>

                {/* Last saved timestamp */}
                {savedConfig?.updated_at && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Last saved:{' '}
                    <span className="font-medium">
                      {new Date(savedConfig.updated_at).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <Button type="submit" disabled={saving} className="gap-2">
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={saving}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </Button>
                </div>
              </form>
            </div>

            {/* ── Preview column ────────────────────────────────────────────── */}
            <div className="space-y-4 lg:sticky lg:top-6">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Live Preview</p>
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                  Updates in real time
                </Badge>
              </div>

              <ReportPreview config={form} />

              <p className="text-xs text-muted-foreground leading-relaxed">
                This mock-up shows how your branding will appear on client-facing audit report covers
                and PDF exports. Actual reports may have additional sections.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
