import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Trash2,
  MailCheck,
  Shield,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { WorkspaceMember, Invitation } from '../../lib/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

type Role = 'admin' | 'member' | 'viewer';

function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    admin:  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    member: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    viewer: 'bg-muted text-muted-foreground border-border',
  };
  const icons: Record<Role, React.ReactNode> = {
    admin:  <ShieldCheck className="w-3 h-3" />,
    member: <Shield className="w-3 h-3" />,
    viewer: <Eye className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium capitalize ${styles[role]}`}>
      {icons[role]}
      {role}
    </span>
  );
}

function InviteStatusBadge({ status }: { status: Invitation['status'] }) {
  const map: Record<Invitation['status'], { cls: string; label: string }> = {
    pending:  { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',  label: 'Pending' },
    accepted: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', label: 'Accepted' },
    expired:  { cls: 'bg-muted text-muted-foreground border-border', label: 'Expired' },
  };
  const { cls, label } = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ── Invite Form ────────────────────────────────────────────────────────────────

interface InviteFormValues {
  email: string;
  role: Role;
}

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wsId: string;
  onSuccess: () => void;
}

function InviteDialog({ open, onOpenChange, wsId, onSuccess }: InviteDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<InviteFormValues>({
    defaultValues: { email: '', role: 'member' },
  });
  const role = watch('role');

  const onSubmit = async (data: InviteFormValues) => {
    setSubmitting(true);
    try {
      await api.workspaces.invite(wsId, { email: data.email, role: data.role });
      toast.success(`Invitation sent to ${data.email}`);
      reset();
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error('Failed to send invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            Send an invitation link to a colleague. They'll be able to join your workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
              })}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={v => setValue('role', v as Role)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin — full access</SelectItem>
                <SelectItem value="member">Member — standard access</SelectItem>
                <SelectItem value="viewer">Viewer — read-only access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Remove Confirmation Dialog ─────────────────────────────────────────────────

interface RemoveDialogProps {
  member: WorkspaceMember | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function RemoveDialog({ member, onClose, onConfirm }: RemoveDialogProps) {
  const [removing, setRemoving] = useState(false);

  const handleConfirm = async () => {
    setRemoving(true);
    await onConfirm();
    setRemoving(false);
  };

  return (
    <Dialog open={!!member} onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove team member</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove{' '}
            <strong>{member?.user_name || member?.user_email}</strong> from the workspace?
            They will lose access immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={removing}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={removing}>
            {removing ? 'Removing…' : 'Remove member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main TeamPage ──────────────────────────────────────────────────────────────

export function TeamPage() {
  const { user, workspace } = useAuth();
  const wsId = workspace?.id ?? '';
  const isOwner = workspace?.owner === user?.id;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<WorkspaceMember | null>(null);
  const [updatingRole, setUpdatingRole] = useState<number | null>(null);

  const {
    data: members,
    isLoading: loadingMembers,
    refetch: refetchMembers,
  } = useApi<WorkspaceMember[]>(
    () => wsId ? api.workspaces.members(wsId) : Promise.resolve([]),
    [wsId],
  );

  const {
    data: invitations,
    isLoading: loadingInvitations,
    refetch: refetchInvitations,
  } = useApi<Invitation[]>(
    () => wsId ? api.workspaces.invitations(wsId) : Promise.resolve([]),
    [wsId],
  );

  const memberList = members ?? [];
  const invitationList = invitations ?? [];

  // Current user's own member record (to know their role)
  const currentMember = memberList.find(m => m.user === user?.id);
  const canManage = isOwner || currentMember?.role === 'admin';

  const handleRoleChange = async (member: WorkspaceMember, newRole: Role) => {
    if (!wsId) return;
    setUpdatingRole(member.id);
    try {
      await api.workspaces.updateMember(wsId, member.id, newRole);
      toast.success(`${member.user_name || member.user_email}'s role updated to ${newRole}`);
      refetchMembers();
    } catch {
      toast.error('Failed to update role.');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!wsId || !memberToRemove) return;
    try {
      await api.workspaces.removeMember(wsId, memberToRemove.id);
      toast.success(`${memberToRemove.user_name || memberToRemove.user_email} removed from workspace`);
      refetchMembers();
    } catch {
      toast.error('Failed to remove member.');
    } finally {
      setMemberToRemove(null);
    }
  };

  const handleResend = async (inv: Invitation) => {
    if (!wsId) return;
    try {
      await api.workspaces.invite(wsId, { email: inv.email, role: inv.role });
      toast.success(`Invitation resent to ${inv.email}`);
      refetchInvitations();
    } catch {
      toast.error('Failed to resend invitation.');
    }
  };

  const isOnlyMember = memberList.length <= 1;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Team Management</h1>
              <p className="text-muted-foreground">
                Manage who has access to your workspace
              </p>
            </div>
            {!loadingMembers && (
              <Badge variant="secondary" className="ml-2 mt-0.5 self-start text-sm px-2.5 py-1">
                {memberList.length} {memberList.length === 1 ? 'member' : 'members'}
              </Badge>
            )}
          </div>
          {canManage && (
            <Button onClick={() => setInviteOpen(true)} className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Invite member
            </Button>
          )}
        </div>

        {/* Members Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Members
            </h2>
          </div>

          {loadingMembers ? (
            <div className="p-8 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : isOnlyMember ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground mb-1">Your team is just you right now</p>
              <p className="text-sm text-muted-foreground mb-4">Invite colleagues to collaborate in this workspace!</p>
              {canManage && (
                <Button onClick={() => setInviteOpen(true)} className="flex items-center gap-2 mx-auto">
                  <UserPlus className="w-4 h-4" />
                  Invite colleagues
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Member', 'Email', 'Role', 'Joined', ...(canManage ? ['Actions'] : [])].map(h => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {memberList.map(member => {
                    const isWorkspaceOwner = workspace?.owner === member.user;
                    const isSelf = member.user === user?.id;
                    const canActOnMember = canManage && !isWorkspaceOwner;

                    return (
                      <tr key={member.id} className="hover:bg-muted/50 transition-colors">
                        {/* Avatar + Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              {member.user_avatar ? (
                                <AvatarImage src={member.user_avatar} alt={member.user_name} />
                              ) : null}
                              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs font-semibold">
                                {getInitials(member.user_name || member.user_email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground">
                                {member.user_name || '(no name)'}
                                {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                              </p>
                              {isWorkspaceOwner && (
                                <p className="text-xs text-muted-foreground">Owner</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4 text-muted-foreground">
                          {member.user_email}
                        </td>

                        {/* Role */}
                        <td className="px-6 py-4">
                          <RoleBadge role={member.role} />
                        </td>

                        {/* Joined */}
                        <td className="px-6 py-4 text-muted-foreground text-sm">
                          {format(new Date(member.joined_at), 'MMM d, yyyy')}
                        </td>

                        {/* Actions */}
                        {canManage && (
                          <td className="px-6 py-4">
                            {canActOnMember ? (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={member.role}
                                  onValueChange={v => handleRoleChange(member, v as Role)}
                                  disabled={updatingRole === member.id}
                                >
                                  <SelectTrigger size="sm" className="w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                  </SelectContent>
                                </Select>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setMemberToRemove(member)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                                  title="Remove member"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Invitations */}
        {canManage && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <MailCheck className="w-4 h-4" />
                Pending invitations
              </h2>
            </div>

            {loadingInvitations ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : invitationList.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No pending invitations</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Email', 'Role', 'Status', 'Expires', 'Actions'].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invitationList.map(inv => (
                      <tr key={inv.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{inv.email}</td>
                        <td className="px-6 py-4">
                          <RoleBadge role={inv.role} />
                        </td>
                        <td className="px-6 py-4">
                          <InviteStatusBadge status={inv.status} />
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">
                          {format(new Date(inv.expires_at), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4">
                          {inv.status !== 'accepted' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResend(inv)}
                            >
                              Resend
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        wsId={wsId}
        onSuccess={refetchInvitations}
      />

      <RemoveDialog
        member={memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
      />
    </AppShell>
  );
}
