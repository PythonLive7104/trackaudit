from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from .models import AccountAlertOverride, Alert, AlertDelivery, NotificationPreference


# ── Inlines ───────────────────────────────────────────────────────────────────

class AlertDeliveryInline(admin.TabularInline):
    model           = AlertDelivery
    extra           = 0
    fields          = ['channel', 'recipient', 'status', 'sent_at', 'error_message']
    readonly_fields = ['channel', 'recipient', 'status', 'sent_at', 'error_message']
    can_delete      = False

    def has_add_permission(self, request, obj=None):
        return False


# ── Alert ─────────────────────────────────────────────────────────────────────

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display  = [
        'title', 'account', 'workspace_name', 'severity_badge',
        'status_badge', 'check_key', 'first_detected_at',
    ]
    list_filter   = ['severity', 'status']
    search_fields = ['title', 'account__account_name', 'check_key', 'account__workspace__name']
    date_hierarchy = 'first_detected_at'
    list_per_page  = 30
    list_select_related = ['account', 'account__workspace', 'resolved_by']
    show_full_result_count = False
    readonly_fields = ['id', 'first_detected_at', 'last_seen_at']
    inlines = [AlertDeliveryInline]
    save_on_top = True

    fieldsets = (
        ('Alert',      {'fields': ('id', 'workspace', 'account', 'audit_check', 'check_key', 'title', 'description')}),
        ('Status',     {'fields': ('severity', 'status', 'snoozed_until', 'resolved_at', 'resolved_by', 'resolve_note')}),
        ('Timestamps', {'fields': ('first_detected_at', 'last_seen_at'), 'classes': ('collapse',)}),
    )

    @admin.display(description='Workspace', ordering='account__workspace__name')
    def workspace_name(self, obj):
        return obj.account.workspace.name

    @admin.display(description='Severity')
    def severity_badge(self, obj):
        colours = {'info': '#6b7280', 'warning': '#f59e0b', 'critical': '#ef4444'}
        colour = colours.get(obj.severity, '#6b7280')
        return format_html(
            '<span style="display:inline-block;padding:1px 8px;border-radius:4px;'
            'background:{};color:#fff;font-size:11px;font-weight:600">{}</span>',
            colour, obj.get_severity_display(),
        )

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {'open': '#ef4444', 'snoozed': '#f59e0b', 'resolved': '#10b981'}
        colour = colours.get(obj.status, '#6b7280')
        return format_html(
            '<span style="display:inline-block;padding:1px 8px;border-radius:4px;'
            'background:{};color:#fff;font-size:11px;font-weight:600">{}</span>',
            colour, obj.get_status_display(),
        )

    actions = ['resolve_alerts']

    @admin.action(description='Mark selected alerts as resolved')
    def resolve_alerts(self, request, queryset):
        updated = queryset.filter(status=Alert.STATUS_OPEN).update(
            status=Alert.STATUS_RESOLVED,
            resolved_at=timezone.now(),
            resolved_by=request.user,
        )
        self.message_user(request, f'{updated} alert(s) resolved.')


# ── AlertDelivery ─────────────────────────────────────────────────────────────

@admin.register(AlertDelivery)
class AlertDeliveryAdmin(admin.ModelAdmin):
    list_display  = ['alert', 'channel', 'recipient', 'status', 'sent_at']
    list_filter   = ['channel', 'status']
    search_fields = ['alert__title', 'recipient']
    date_hierarchy = 'created_at'
    list_per_page  = 50
    list_select_related = ['alert']
    readonly_fields = ['alert', 'created_at', 'sent_at']

    def has_add_permission(self, request):
        return False


# ── NotificationPreference ───────────────────────────────────────────────────

@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display  = ['workspace', 'email_enabled', 'slack_enabled', 'daily_digest_enabled', 'min_severity', 'daily_digest_hour']
    list_filter   = ['email_enabled', 'slack_enabled', 'min_severity', 'daily_digest_enabled']
    search_fields = ['workspace__name']
    list_select_related = ['workspace']
    list_per_page  = 50


# ── AccountAlertOverride ──────────────────────────────────────────────────────

@admin.register(AccountAlertOverride)
class AccountAlertOverrideAdmin(admin.ModelAdmin):
    list_display  = ['account', 'workspace', 'muted_badge', 'min_severity_override', 'updated_at']
    list_filter   = ['is_muted', 'min_severity_override']
    search_fields = ['account__account_name', 'workspace__name']
    list_select_related = ['account', 'workspace']
    list_per_page  = 50

    @admin.display(description='Muted', boolean=True, ordering='is_muted')
    def muted_badge(self, obj):
        return obj.is_muted
