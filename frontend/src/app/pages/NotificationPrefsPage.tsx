import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Bell,
  Mail,
  Slack,
  Webhook,
  Trash2,
  Plus,
  Save,
  FlaskConical,
  CheckCircle2,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
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
import type {
  AlertSeverity,
  NotificationPreference,
  AccountAlertOverride,
} from '../../lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEVERITY_OPTIONS: { value: AlertSeverity; label: string }[] = [
  { value: 'info',     label: 'Info' },
  { value: 'warning',  label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${String(h).padStart(2, '0')}:00`,
}));

const DEFAULT_PREFS: NotificationPreference = {
  email_enabled: true,
  slack_enabled: false,
  webhook_url: '',
  min_severity: 'warning',
  daily_digest_enabled: false,
  daily_digest_hour: 8,
};

// ── Add override dialog ───────────────────────────────────────────────────────

interface AddOverrideDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (accountId: string, isMuted: boolean, minSeverity: AlertSeverity | '') => Promise<void>;
  accounts: { id: string; account_name: string }[];
  existingAccountIds: string[];
}

function AddOverrideDialog({
  open,
  onClose,
  onSave,
  accounts,
  existingAccountIds,
}: AddOverrideDialogProps) {
  const [accountId, setAccountId]   = useState('');
  const [isMuted, setIsMuted]       = useState(false);
  const [minSeverity, setMinSeverity] = useState<AlertSeverity | ''>('');
  const [saving, setSaving]         = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setAccountId('');
      setIsMuted(false);
      setMinSeverity('');
    }
  }, [open]);

  const availableAccounts = accounts.filter(a => !existingAccountIds.includes(a.id));

  const handleSave = async () => {
    if (!accountId) return;
    setSaving(true);
    try {
      await onSave(accountId, isMuted, minSeverity);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Account Override</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account select */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Account</label>
            {availableAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All accounts already have an override.
              </p>
            ) : (
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account…" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Mute toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Mute all alerts</p>
              <p className="text-xs text-muted-foreground">Suppress all notifications for this account</p>
            </div>
            <Switch checked={isMuted} onCheckedChange={setIsMuted} />
          </div>

          {/* Min severity override */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Min severity override
              <span className="ml-1 text-xs text-muted-foreground">(leave blank to use workspace default)</span>
            </label>
            <Select
              value={minSeverity}
              onValueChange={v => setMinSeverity(v as AlertSeverity | '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Use workspace default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Workspace default</SelectItem>
                {SEVERITY_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !accountId || availableAccounts.length === 0}
          >
            {saving ? 'Saving…' : 'Add override'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Workspace defaults column ─────────────────────────────────────────────────

interface WorkspaceDefaultsProps {
  wsId: string;
}

function WorkspaceDefaults({ wsId }: WorkspaceDefaultsProps) {
  const { data: prefData, isLoading } = useApi(
    () => wsId ? api.alerts.preferences(wsId) : Promise.resolve(DEFAULT_PREFS),
    [wsId],
  );

  const [form, setForm] = useState<NotificationPreference>(DEFAULT_PREFS);
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle');

  // Sync once data loads
  useEffect(() => {
    if (prefData) setForm(prefData);
  }, [prefData]);

  const setField = <K extends keyof NotificationPreference>(
    key: K,
    value: NotificationPreference[K],
  ) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.alerts.updatePreferences(wsId, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!form.webhook_url) return;
    setTesting(true);
    setTestResult('idle');
    try {
      await fetch(form.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test', source: 'TrackAudit' }),
      });
      setTestResult('ok');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult('idle'), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Email alerts</span>
        </div>
        <Switch
          checked={form.email_enabled}
          onCheckedChange={v => setField('email_enabled', v)}
        />
      </div>

      {/* Slack */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Slack className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Slack alerts</span>
          </div>
          <Switch
            checked={form.slack_enabled}
            onCheckedChange={v => setField('slack_enabled', v)}
          />
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Configure Slack in Integrations first
        </p>
      </div>

      {/* Webhook */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Webhook URL</span>
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://…"
            className="flex-1 h-9 rounded-md border border-input bg-input-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={form.webhook_url}
            onChange={e => setField('webhook_url', e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-9 shrink-0"
            disabled={!form.webhook_url || testing}
            onClick={handleTestWebhook}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            {testing ? 'Testing…' : 'Test'}
          </Button>
        </div>
        {testResult === 'ok'   && <p className="text-xs text-emerald-600 dark:text-emerald-400">Test webhook sent successfully.</p>}
        {testResult === 'fail' && <p className="text-xs text-red-600 dark:text-red-400">Webhook request failed. Check the URL and try again.</p>}
      </div>

      {/* Min severity */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Minimum severity</label>
        <Select
          value={form.min_severity}
          onValueChange={v => setField('min_severity', v as AlertSeverity)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Only send notifications for alerts at or above this severity.
        </p>
      </div>

      {/* Daily digest */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Daily digest</p>
          <p className="text-xs text-muted-foreground">Receive a daily summary email</p>
        </div>
        <Switch
          checked={form.daily_digest_enabled}
          onCheckedChange={v => setField('daily_digest_enabled', v)}
        />
      </div>

      {/* Digest hour — visible only when digest is enabled */}
      {form.daily_digest_enabled && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Digest delivery time (UTC)</label>
          <Select
            value={String(form.daily_digest_hour)}
            onValueChange={v => setField('daily_digest_hour', Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOUR_OPTIONS.map(h => (
                <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Save */}
      <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
        {saved ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Saved
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save preferences'}
          </>
        )}
      </Button>
    </div>
  );
}

// ── Per-account overrides column ──────────────────────────────────────────────

interface AccountOverridesProps {
  wsId: string;
}

function AccountOverrides({ wsId }: AccountOverridesProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const {
    data: overridesData,
    isLoading: loadingOverrides,
    refetch: refetchOverrides,
  } = useApi(
    () => wsId ? api.alerts.overrides.list(wsId) : Promise.resolve([]),
    [wsId],
  );

  const { data: accountsData } = useApi(
    () => wsId ? api.accounts.list(wsId) : Promise.resolve({ count: 0, next: null, previous: null, results: [] }),
    [wsId],
  );

  const overrides: AccountAlertOverride[] = overridesData ?? [];
  const accounts = accountsData?.results ?? [];

  const handleAddOverride = async (
    accountId: string,
    isMuted: boolean,
    minSeverity: AlertSeverity | '',
  ) => {
    await api.alerts.overrides.update(wsId, accountId, {
      is_muted: isMuted,
      min_severity_override: minSeverity,
    });
    refetchOverrides();
  };

  const handleDelete = async (accountId: string) => {
    setDeleting(accountId);
    try {
      await api.alerts.overrides.delete(wsId, accountId);
      refetchOverrides();
    } finally {
      setDeleting(null);
    }
  };

  if (loadingOverrides) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Override workspace defaults on a per-account basis.
        </p>
        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setDialogOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Add override
        </Button>
      </div>

      {overrides.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-xl">
          <Bell className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">No overrides yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            All accounts follow the workspace defaults.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {overrides.map(ov => (
            <div
              key={ov.id}
              className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{ov.account_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {ov.is_muted && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                      Muted
                    </Badge>
                  )}
                  {ov.min_severity_override ? (
                    <span className="text-xs text-muted-foreground">
                      Min: {SEVERITY_LABEL[ov.min_severity_override]}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      Workspace default severity
                    </span>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                disabled={deleting === ov.account}
                onClick={() => handleDelete(ov.account)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="sr-only">Delete override</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      <AddOverrideDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleAddOverride}
        accounts={accounts}
        existingAccountIds={overrides.map(o => o.account)}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function NotificationPrefsPage() {
  const { workspace } = useAuth();
  const _navigate = useNavigate();
  const wsId = workspace?.id ?? '';

  return (
    <AppShell>
      <div className="max-w-[1200px] mx-auto px-8 py-8 space-y-8">

        {/* Page heading */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Notification Preferences</h1>
          <p className="text-muted-foreground text-sm">
            Control how and when TrackAudit alerts reach you and your team.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Left — Workspace Defaults */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Workspace Defaults</h2>
            </div>
            <WorkspaceDefaults wsId={wsId} />
          </div>

          {/* Right — Per-Account Overrides */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Per-Account Overrides</h2>
            </div>
            <AccountOverrides wsId={wsId} />
          </div>

        </div>
      </div>
    </AppShell>
  );
}
