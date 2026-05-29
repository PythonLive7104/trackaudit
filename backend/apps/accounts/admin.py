from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db.models import Count
from django.utils.html import format_html

from .models import Invitation, PasswordResetToken, User, Workspace, WorkspaceMember

# ── Admin site branding ───────────────────────────────────────────────────────
admin.site.site_header = "TrackAudit Admin"
admin.site.site_title  = "TrackAudit"
admin.site.index_title = "Operations Dashboard"


# ── Inlines ───────────────────────────────────────────────────────────────────

class WorkspaceMemberInline(admin.TabularInline):
    model              = WorkspaceMember
    extra              = 0
    fields             = ['user', 'role', 'joined_at']
    readonly_fields    = ['joined_at']
    autocomplete_fields = ['user']
    show_change_link   = True


# ── User ──────────────────────────────────────────────────────────────────────

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display  = ['email', 'full_name', 'workspace_count', 'is_active', 'is_staff', 'email_verified', 'created_at']
    list_filter   = ['is_active', 'is_staff', 'email_verified']
    search_fields = ['email', 'full_name']
    ordering      = ['-created_at']
    date_hierarchy = 'created_at'
    list_per_page  = 30
    show_full_result_count = False
    save_on_top    = True
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        (None,          {'fields': ('email', 'password')}),
        ('Personal',    {'fields': ('full_name', 'avatar_url', 'google_id')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'email_verified',
                                    'groups', 'user_permissions'), 'classes': ('collapse',)}),
        ('Timestamps',  {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'full_name', 'password1', 'password2')}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _ws_count=Count('workspace_memberships', distinct=True),
        )

    @admin.display(description='Workspaces', ordering='_ws_count')
    def workspace_count(self, obj):
        return obj._ws_count

    actions = ['activate_users', 'deactivate_users', 'verify_emails']

    @admin.action(description='Activate selected users')
    def activate_users(self, request, queryset):
        n = queryset.update(is_active=True)
        self.message_user(request, f'{n} user(s) activated.')

    @admin.action(description='Deactivate selected users')
    def deactivate_users(self, request, queryset):
        n = queryset.update(is_active=False)
        self.message_user(request, f'{n} user(s) deactivated.')

    @admin.action(description='Mark emails as verified')
    def verify_emails(self, request, queryset):
        n = queryset.update(email_verified=True)
        self.message_user(request, f'{n} email(s) marked verified.')


# ── Workspace ─────────────────────────────────────────────────────────────────

@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display  = ['name', 'slug', 'owner_email', 'member_count', 'account_count', 'created_at']
    search_fields = ['name', 'slug', 'owner__email']
    date_hierarchy = 'created_at'
    list_per_page  = 30
    list_select_related = ['owner']
    show_full_result_count = False
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [WorkspaceMemberInline]
    save_on_top = True

    fieldsets = (
        (None,         {'fields': ('id', 'name', 'slug', 'owner')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _member_count=Count('members', distinct=True),
            _account_count=Count('monitored_accounts', distinct=True),
        )

    @admin.display(description='Owner', ordering='owner__email')
    def owner_email(self, obj):
        return obj.owner.email

    @admin.display(description='Members', ordering='_member_count')
    def member_count(self, obj):
        return obj._member_count

    @admin.display(description='Accounts', ordering='_account_count')
    def account_count(self, obj):
        return obj._account_count


# ── WorkspaceMember ───────────────────────────────────────────────────────────

@admin.register(WorkspaceMember)
class WorkspaceMemberAdmin(admin.ModelAdmin):
    list_display  = ['user', 'workspace', 'role', 'joined_at']
    list_filter   = ['role']
    search_fields = ['user__email', 'workspace__name']
    date_hierarchy = 'joined_at'
    list_per_page  = 50
    list_select_related = ['user', 'workspace']


# ── Invitation ────────────────────────────────────────────────────────────────

@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display  = ['email', 'workspace', 'role', 'status_badge', 'invited_by', 'created_at', 'expires_at']
    list_filter   = ['status', 'role']
    search_fields = ['email', 'workspace__name']
    date_hierarchy = 'created_at'
    list_per_page  = 30
    list_select_related = ['workspace', 'invited_by']
    readonly_fields = ['id', 'token', 'created_at', 'accepted_at']

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {'pending': '#f59e0b', 'accepted': '#10b981', 'expired': '#6b7280'}
        colour = colours.get(obj.status, '#6b7280')
        return format_html(
            '<span style="display:inline-block;padding:1px 8px;border-radius:4px;'
            'background:{};color:#fff;font-size:11px;font-weight:600">{}</span>',
            colour, obj.get_status_display(),
        )


# ── PasswordResetToken ────────────────────────────────────────────────────────

@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display  = ['user', 'created_at', 'expires_at', 'is_used']
    search_fields = ['user__email']
    list_select_related = ['user']
    readonly_fields = ['token', 'created_at']
    list_per_page  = 30

    def has_add_permission(self, request):
        return False

    @admin.display(description='Used', boolean=True)
    def is_used(self, obj):
        return obj.used_at is not None
