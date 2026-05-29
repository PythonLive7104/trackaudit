import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  User as UserIcon,
  Building2,
  Shield,
  ExternalLink,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Mail,
  Bell,
  Users,
  FileText,
  CreditCard,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';

import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';

import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ── Section wrapper ───────────────────────────────────────────────────────────

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  accent?: string;
}

function SectionCard({ icon, title, description, children, accent = 'bg-primary/10 text-primary' }: SectionCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-5 border-b border-border flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Section 1 — Profile ───────────────────────────────────────────────────────

function ProfileSection() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [saving, setSaving] = useState(false);

  const initials = user ? getInitials(user.full_name || user.email) : '?';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Full name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await api.auth.updateMe({ full_name: fullName.trim() });
      await refreshUser();
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      icon={<UserIcon className="w-5 h-5" />}
      title="Profile"
      description="Your personal account information"
    >
      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar row */}
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <Avatar className="w-20 h-20 ring-2 ring-border ring-offset-2 ring-offset-background">
              {user?.avatar_url ? (
                <AvatarImage src={user.avatar_url} alt={user?.full_name} />
              ) : null}
              <AvatarFallback
                className="text-xl font-bold text-white"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%)',
                }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-2 border-background rounded-full" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-lg">{user?.full_name || 'Your Name'}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Member since {formatDate(user?.created_at ?? '')}
            </p>
          </div>
        </div>

        <Separator />

        {/* Fields */}
        <div className="grid grid-cols-1 gap-5 max-w-md">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="profile-name" className="text-sm font-medium">
              Full Name
            </Label>
            <Input
              id="profile-name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Jane Smith"
              className="h-10"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="profile-email" className="text-sm font-medium">
                Email Address
              </Label>
              {user?.email_verified ? (
                <Badge className="gap-1 bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/15 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                  <Mail className="w-3 h-3" />
                  Unverified
                </Badge>
              )}
            </div>
            <Input
              id="profile-email"
              type="email"
              value={user?.email ?? ''}
              readOnly
              className="h-10 bg-muted/50 text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact support if you need assistance.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : 'Save Profile'}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

// ── Section 2 — Workspace ─────────────────────────────────────────────────────

function WorkspaceSection() {
  const { workspace } = useAuth();
  const [wsName, setWsName] = useState(workspace?.name ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace || !wsName.trim()) return;
    setSaving(true);
    try {
      await api.workspaces.update(workspace.id, { name: wsName.trim() });
      toast.success('Workspace updated');
    } catch {
      toast.error('Failed to update workspace. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      icon={<Building2 className="w-5 h-5" />}
      title="Workspace"
      description="Your agency workspace settings"
      accent="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
    >
      <form onSubmit={handleSave} className="space-y-5 max-w-md">
        {/* Workspace Name */}
        <div className="space-y-2">
          <Label htmlFor="ws-name" className="text-sm font-medium">
            Workspace Name
          </Label>
          <Input
            id="ws-name"
            value={wsName}
            onChange={e => setWsName(e.target.value)}
            placeholder="Acme Marketing Agency"
            className="h-10"
          />
        </div>

        {/* Slug (readonly) */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Workspace URL</Label>
          <div className="flex items-center h-10 rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground gap-0 overflow-hidden">
            <span className="text-muted-foreground/60 shrink-0">app.trackaudit.io/</span>
            <span className="font-mono font-medium text-foreground">{workspace?.slug ?? '—'}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Slug cannot be changed. Contact support if you need a different URL.
          </p>
        </div>

        {/* Created date */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Created</Label>
          <p className="text-sm text-muted-foreground">
            {formatDate(workspace?.created_at ?? '')}
          </p>
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : 'Save Workspace'}
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

// ── Section 3 — Account Security ──────────────────────────────────────────────

function SecuritySection() {
  const { user } = useAuth();
  const [sendingReset, setSendingReset] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    try {
      await api.auth.requestPasswordReset(user.email);
      toast.success('Password reset email sent', {
        description: `Check ${user.email} for reset instructions.`,
      });
    } catch {
      toast.error('Failed to send reset email. Please try again.');
    } finally {
      setSendingReset(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteDialogOpen(false);
    toast.info('Contact support to delete your account', {
      description: 'Email support@trackaudit.io to request account deletion.',
    });
  };

  return (
    <>
      <SectionCard
        icon={<Shield className="w-5 h-5" />}
        title="Account Security"
        description="Manage your password and account access"
        accent="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
      >
        <div className="space-y-6">
          {/* Change Password */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                Password
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                We'll send a secure password reset link to your email address.
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Send Password Reset Email</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sends a reset link to <span className="font-mono">{user?.email ?? '…'}</span>
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePasswordReset}
                disabled={sendingReset}
                className="gap-2 shrink-0"
              >
                {sendingReset ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    Send Reset Email
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Danger Zone
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Permanent, irreversible actions. Proceed with care.
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Delete Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently remove your account and all associated data. This cannot be undone.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Account?
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-1">
              <p>
                Deleting your account will permanently remove all your data including workspaces,
                audits, reports, and integrations.
              </p>
              <p className="font-medium text-foreground">This action cannot be undone.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              I Understand, Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Section 4 — Quick Links ───────────────────────────────────────────────────

interface QuickLink {
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  external?: boolean;
}

const QUICK_LINKS: QuickLink[] = [
  {
    icon: <Users className="w-4 h-4" />,
    label: 'Team Management',
    description: 'Invite team members, manage roles and permissions',
    href: '/settings/team',
  },
  {
    icon: <Bell className="w-4 h-4" />,
    label: 'Notification Preferences',
    description: 'Email, Slack, severity thresholds, daily digest',
    href: '/settings/notifications',
  },
  {
    icon: <FileText className="w-4 h-4" />,
    label: 'API Documentation',
    description: 'Explore endpoints and integrate TrackAudit into your workflows',
    href: '/docs',
  },
  {
    icon: <CreditCard className="w-4 h-4" />,
    label: 'Billing',
    description: 'Manage your subscription, invoices, and payment methods',
    href: '/billing',
  },
];

function QuickLinksSection() {
  const navigate = useNavigate();

  return (
    <SectionCard
      icon={<ExternalLink className="w-5 h-5" />}
      title="Quick Links"
      description="Jump to other settings areas"
      accent="bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
    >
      <div className="space-y-1.5">
        {QUICK_LINKS.map((link, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => navigate(link.href)}
            className="w-full flex items-center gap-4 p-3.5 rounded-xl hover:bg-muted/60 transition-colors text-left group"
          >
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              {link.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{link.label}</p>
              <p className="text-xs text-muted-foreground truncate">{link.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Main SettingsPage ──────────────────────────────────────────────────────────

export function SettingsPage() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Page header */}
        <div className="pb-2">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account preferences and workspace configuration
          </p>
        </div>

        {/* Sections */}
        <ProfileSection />
        <WorkspaceSection />
        <SecuritySection />
        <QuickLinksSection />
      </div>
    </AppShell>
  );
}
