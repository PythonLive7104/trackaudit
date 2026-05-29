import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plug,
  Unplug,
  AlertTriangle,
  Loader2,
  Calendar,
  Zap,
  BarChart3,
  Database,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '../components/AppShell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';

import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { useApi } from '../../hooks/useApi';
import type { GoogleAdsConnection, SlackIntegration } from '../../lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ── Status Badges ─────────────────────────────────────────────────────────────

function ConnectedBadge() {
  return (
    <Badge className="gap-1.5 bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/15 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800 font-medium">
      <CheckCircle2 className="w-3 h-3" />
      Connected
    </Badge>
  );
}

function DisconnectedBadge() {
  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <XCircle className="w-3 h-3" />
      Not Connected
    </Badge>
  );
}

function InactiveBadge() {
  return (
    <Badge variant="outline" className="gap-1.5 text-amber-600 border-amber-300">
      <AlertTriangle className="w-3 h-3" />
      Inactive
    </Badge>
  );
}

function ComingSoonBadge() {
  return (
    <Badge variant="secondary" className="text-xs">
      Coming Soon
    </Badge>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  loading?: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({
  open,
  title,
  description,
  loading,
  confirmLabel = 'Disconnect',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Disconnecting…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Google Ads Logo (colorful G) ──────────────────────────────────────────────

function GoogleAdsLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ── Slack Logo ────────────────────────────────────────────────────────────────

function SlackLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#E01E5A" />
      <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A" />
      <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#36C5F0" />
      <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0" />
      <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#2EB67D" />
      <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#2EB67D" />
      <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E" />
      <path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E" />
    </svg>
  );
}

// ── Google Ads Section ────────────────────────────────────────────────────────

interface GoogleAdsSectionProps {
  wsId: string;
  connections: GoogleAdsConnection[];
  onRefresh: () => void;
}

function GoogleAdsSection({ wsId, connections, onRefresh }: GoogleAdsSectionProps) {
  const [connecting, setConnecting] = useState(false);
  const [reconnecting, setReconnecting] = useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<GoogleAdsConnection | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const isConnected = connections.length > 0;
  const anyActive = connections.some(c => c.is_active);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { auth_url } = await api.integrations.googleAds.authUrl(wsId);
      window.location.href = auth_url;
    } catch {
      toast.error('Failed to start Google Ads connection. Please try again.');
      setConnecting(false);
    }
  };

  const handleReconnect = async (conn: GoogleAdsConnection) => {
    setReconnecting(conn.id);
    try {
      const { auth_url } = await api.integrations.googleAds.reauthorize(wsId, conn.id);
      window.location.href = auth_url;
    } catch {
      toast.error('Failed to reauthorize. Please try again.');
      setReconnecting(null);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    setDisconnecting(true);
    try {
      await api.integrations.googleAds.disconnect(wsId, disconnectTarget.id);
      toast.success('Account disconnected', {
        description: `${disconnectTarget.google_account_email} has been removed.`,
      });
      onRefresh();
    } catch {
      toast.error('Failed to disconnect account. Please try again.');
    } finally {
      setDisconnecting(false);
      setDisconnectTarget(null);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-red-50 dark:from-blue-950/50 dark:to-red-950/50 border border-border flex items-center justify-center shrink-0">
                <GoogleAdsLogo size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-foreground">Google Ads</h3>
                  <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">
                    Primary
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Import ad accounts and run automated audits
                </p>
              </div>
            </div>
            <div className="shrink-0 mt-0.5">
              {isConnected && anyActive ? (
                <ConnectedBadge />
              ) : isConnected ? (
                <InactiveBadge />
              ) : (
                <DisconnectedBadge />
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Connected accounts list */}
          {connections.length > 0 && (
            <div className="space-y-2">
              {connections.map(conn => (
                <div
                  key={conn.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/50 border border-border"
                >
                  <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                    <GoogleAdsLogo size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {conn.google_account_email}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {conn.is_active ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Needs reauthorization
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Connected {formatDate(conn.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!conn.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReconnect(conn)}
                        disabled={reconnecting === conn.id}
                        className="gap-1.5 h-8 text-xs"
                      >
                        {reconnecting === conn.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        {reconnecting === conn.id ? 'Redirecting…' : 'Reauthorize'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                      onClick={() => setDisconnectTarget(conn)}
                    >
                      <Unplug className="w-3 h-3" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Connect / Add Another button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleConnect}
            disabled={connecting}
            className="gap-2"
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to Google…
              </>
            ) : (
              <>
                <Plug className="w-4 h-4" />
                {isConnected ? 'Add Another Account' : 'Connect Google Ads'}
              </>
            )}
          </Button>

          {!isConnected && (
            <p className="text-xs text-muted-foreground">
              Authorise TrackAudit to access your Google Ads account data via a secure OAuth flow.
              No passwords are stored.
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!disconnectTarget}
        title="Disconnect Google Ads account?"
        description={`This will remove the connection for ${disconnectTarget?.google_account_email ?? 'this account'} and stop all audits for its monitored sub-accounts. This cannot be undone.`}
        loading={disconnecting}
        onConfirm={handleDisconnect}
        onCancel={() => setDisconnectTarget(null)}
      />
    </>
  );
}

// ── Slack Section ─────────────────────────────────────────────────────────────

interface SlackSectionProps {
  wsId: string;
  integration: SlackIntegration | null;
  connected: boolean;
  onRefresh: () => void;
}

function SlackSection({ wsId, integration, connected, onRefresh }: SlackSectionProps) {
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.integrations.slack.disconnect(wsId);
      toast.success('Slack disconnected', {
        description: 'Alert notifications to Slack have been disabled.',
      });
      onRefresh();
    } catch {
      toast.error('Failed to disconnect Slack. Please try again.');
    } finally {
      setDisconnecting(false);
      setDisconnectOpen(false);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-yellow-50 dark:from-purple-950/50 dark:to-yellow-950/50 border border-border flex items-center justify-center shrink-0">
                <SlackLogo size={22} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Slack</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Get alert notifications and daily digests in Slack
                </p>
              </div>
            </div>
            <div className="shrink-0 mt-0.5">
              {connected ? <ConnectedBadge /> : <DisconnectedBadge />}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {connected && integration ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-0.5">Workspace</p>
                  <p className="text-sm font-semibold text-foreground">{integration.slack_workspace_name}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/50 border border-border">
                  <p className="text-xs text-muted-foreground mb-0.5">Channel</p>
                  <p className="text-sm font-semibold text-foreground">#{integration.channel_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  Receiving alert notifications and daily digest reports
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 h-8 text-xs shrink-0"
                  onClick={() => setDisconnectOpen(true)}
                >
                  <Unplug className="w-3 h-3" />
                  Disconnect
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Connect your Slack workspace to receive real-time audit alerts and daily health
                  digest reports directly in any channel.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Instant critical alert notifications</li>
                  <li>Daily health score digests</li>
                  <li>Configurable severity thresholds</li>
                </ul>
              </div>
              <Button variant="outline" size="sm" disabled className="gap-2 opacity-70">
                <SlackLogo size={14} />
                Connect Slack (Coming Soon)
              </Button>
              <p className="text-xs text-muted-foreground">
                Slack OAuth flow is in development and will be available shortly.
              </p>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={disconnectOpen}
        title="Disconnect Slack?"
        description="Alert notifications and daily digest reports will stop being sent to Slack until you reconnect."
        loading={disconnecting}
        onConfirm={handleDisconnect}
        onCancel={() => setDisconnectOpen(false)}
      />
    </>
  );
}

// ── Coming Soon Cards ─────────────────────────────────────────────────────────

interface ComingSoonCardProps {
  icon: React.ReactNode;
  iconBg: string;
  name: string;
  description: string;
}

function ComingSoonCard({ icon, iconBg, name, description }: ComingSoonCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden opacity-70">
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <ComingSoonBadge />
        </div>
      </div>
      <div className="px-5 py-3.5">
        <p className="text-xs text-muted-foreground">
          We're working on this integration. You'll be notified when it becomes available.
        </p>
      </div>
    </div>
  );
}

const COMING_SOON = [
  {
    icon: <BarChart3 className="w-4 h-4 text-orange-500" />,
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    name: 'GA4 Analytics',
    description: 'Cross-reference GA4 conversion events with Google Ads data',
  },
  {
    icon: <Users className="w-4 h-4 text-orange-600" />,
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    name: 'HubSpot CRM',
    description: 'Sync offline conversions and revenue attribution from HubSpot',
  },
  {
    icon: <TrendingUp className="w-4 h-4 text-blue-600" />,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    name: 'Meta Ads',
    description: 'Audit Meta Ads conversion tracking and pixel setup',
  },
  {
    icon: <Database className="w-4 h-4 text-sky-500" />,
    iconBg: 'bg-sky-100 dark:bg-sky-900/30',
    name: 'Salesforce',
    description: 'Import CRM data to enrich conversion reporting',
  },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export function IntegrationsPage() {
  const { workspace } = useAuth();
  const wsId = workspace?.id ?? '';

  const {
    data: googleConnections,
    isLoading: loadingConnections,
    refetch: refetchConnections,
  } = useApi<GoogleAdsConnection[]>(
    () =>
      wsId
        ? api.integrations.googleAds.connections(wsId)
        : Promise.resolve([]),
    [wsId],
  );

  const {
    data: slackIntegration,
    isLoading: loadingSlack,
    refetch: refetchSlack,
  } = useApi<SlackIntegration | null>(
    async () => {
      if (!wsId) return null;
      try {
        return await api.integrations.slack.get(wsId);
      } catch {
        return null;
      }
    },
    [wsId],
  );

  const isLoading = loadingConnections || loadingSlack;

  const connections = googleConnections ?? [];
  const slackConnected = slackIntegration !== null && slackIntegration?.is_active !== false;

  const handleRefreshAll = () => {
    refetchConnections();
    refetchSlack();
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Integrations</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Connect your tools to TrackAudit to enable automated audits and notifications
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isLoading}
            className="gap-2 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading integrations…</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active integrations */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-foreground">Available Integrations</h2>
                <Separator className="flex-1" />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <GoogleAdsSection
                  wsId={wsId}
                  connections={connections}
                  onRefresh={refetchConnections}
                />
                <SlackSection
                  wsId={wsId}
                  integration={slackIntegration ?? null}
                  connected={slackConnected}
                  onRefresh={refetchSlack}
                />
              </div>
            </div>

            {/* Coming Soon */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-muted-foreground">Coming Soon</h2>
                <Separator className="flex-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {COMING_SOON.map(item => (
                  <ComingSoonCard key={item.name} {...item} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
