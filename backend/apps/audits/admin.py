from django.contrib import admin
from django.utils.html import format_html

from .models import AuditCheck, AuditRun, AuditSchedule, HealthScoreHistory


# ── Inlines ───────────────────────────────────────────────────────────────────

class AuditCheckInline(admin.TabularInline):
    model           = AuditCheck
    extra           = 0
    fields          = ['check_name', 'category', 'status', 'severity', 'finding_summary']
    readonly_fields = ['check_name', 'category', 'status', 'severity', 'finding_summary']
    can_delete      = False
    show_change_link = True
    max_num         = 0

    def has_add_permission(self, request, obj=None):
        return False


# ── AuditRun ──────────────────────────────────────────────────────────────────

@admin.register(AuditRun)
class AuditRunAdmin(admin.ModelAdmin):
    list_display  = [
        'id_short', 'account', 'workspace_name', 'status_badge',
        'health_score_display', 'pass_count', 'warning_count', 'critical_count',
        'trigger_type', 'duration_display', 'created_at',
    ]
    list_filter   = ['status', 'trigger_type']
    search_fields = ['account__account_name', 'account__workspace__name']
    date_hierarchy = 'created_at'
    list_per_page  = 25
    list_select_related = ['account', 'account__workspace', 'triggered_by']
    show_full_result_count = False
    readonly_fields = ['id', 'created_at', 'started_at', 'completed_at', 'failure_reason']
    inlines = [AuditCheckInline]
    save_on_top = True

    fieldsets = (
        ('Run',      {'fields': ('id', 'account', 'trigger_type', 'triggered_by', 'status', 'failure_reason')}),
        ('Results',  {'fields': ('health_score', 'pass_count', 'warning_count', 'critical_count',
                                 'error_count', 'estimated_wasted_spend')}),
        ('Timing',   {'fields': ('created_at', 'started_at', 'completed_at')}),
    )

    @admin.display(description='ID')
    def id_short(self, obj):
        return str(obj.id)[:8] + '…'

    @admin.display(description='Workspace', ordering='account__workspace__name')
    def workspace_name(self, obj):
        return obj.account.workspace.name

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {'queued': '#6b7280', 'running': '#3b82f6', 'completed': '#10b981', 'failed': '#ef4444'}
        colour = colours.get(obj.status, '#6b7280')
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;border-radius:4px;'
            'background:{};color:#fff;font-size:11px;font-weight:600">{}</span>',
            colour, obj.get_status_display(),
        )

    @admin.display(description='Health', ordering='health_score')
    def health_score_display(self, obj):
        if obj.health_score is None:
            return '—'
        colour = '#10b981' if obj.health_score >= 80 else '#f59e0b' if obj.health_score >= 60 else '#ef4444'
        return format_html('<span style="font-weight:700;color:{}">{}</span>', colour, obj.health_score)

    @admin.display(description='Duration')
    def duration_display(self, obj):
        secs = obj.duration_seconds
        if secs is None:
            return '—'
        return f'{secs:.0f}s' if secs < 60 else f'{secs / 60:.1f}m'


# ── AuditCheck ────────────────────────────────────────────────────────────────

@admin.register(AuditCheck)
class AuditCheckAdmin(admin.ModelAdmin):
    list_display  = ['check_name', 'category', 'status_badge', 'severity_badge', 'account_name', 'created_at']
    list_filter   = ['status', 'severity', 'category']
    search_fields = ['check_name', 'check_key', 'audit_run__account__account_name']
    date_hierarchy = 'created_at'
    list_per_page  = 50
    list_select_related = ['audit_run', 'audit_run__account']
    show_full_result_count = False
    readonly_fields = ['audit_run', 'check_key', 'created_at', 'raw_data']

    @admin.display(description='Account', ordering='audit_run__account__account_name')
    def account_name(self, obj):
        return obj.audit_run.account.account_name

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {'pass': '#10b981', 'warning': '#f59e0b', 'critical': '#ef4444', 'error': '#6b7280'}
        colour = colours.get(obj.status, '#6b7280')
        return format_html(
            '<span style="display:inline-block;padding:1px 6px;border-radius:4px;'
            'background:{};color:#fff;font-size:11px;font-weight:600">{}</span>',
            colour, obj.get_status_display(),
        )

    @admin.display(description='Severity')
    def severity_badge(self, obj):
        colours = {'low': '#6b7280', 'medium': '#f59e0b', 'high': '#f97316', 'critical': '#ef4444'}
        colour = colours.get(obj.severity, '#6b7280')
        return format_html('<span style="font-weight:600;color:{}">{}</span>', colour, obj.get_severity_display())


# ── AuditSchedule ─────────────────────────────────────────────────────────────

@admin.register(AuditSchedule)
class AuditScheduleAdmin(admin.ModelAdmin):
    list_display  = ['account', 'workspace_name', 'frequency', 'active_badge', 'last_run_at', 'next_run_at']
    list_filter   = ['frequency', 'is_active']
    search_fields = ['account__account_name', 'account__workspace__name']
    list_per_page  = 50
    list_select_related = ['account', 'account__workspace']

    @admin.display(description='Workspace', ordering='account__workspace__name')
    def workspace_name(self, obj):
        return obj.account.workspace.name

    @admin.display(description='Active', boolean=True, ordering='is_active')
    def active_badge(self, obj):
        return obj.is_active

    actions = ['enable_schedules', 'disable_schedules']

    @admin.action(description='Enable selected schedules')
    def enable_schedules(self, request, queryset):
        queryset.update(is_active=True)
        self.message_user(request, 'Selected schedules enabled.')

    @admin.action(description='Disable selected schedules')
    def disable_schedules(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, 'Selected schedules disabled.')


# ── HealthScoreHistory ────────────────────────────────────────────────────────

@admin.register(HealthScoreHistory)
class HealthScoreHistoryAdmin(admin.ModelAdmin):
    list_display  = ['account', 'workspace_name', 'score_display', 'recorded_at']
    search_fields = ['account__account_name', 'account__workspace__name']
    date_hierarchy = 'recorded_at'
    list_per_page  = 50
    list_select_related = ['account', 'account__workspace']
    show_full_result_count = False
    ordering = ['-recorded_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    @admin.display(description='Workspace')
    def workspace_name(self, obj):
        return obj.account.workspace.name

    @admin.display(description='Score', ordering='score')
    def score_display(self, obj):
        colour = '#10b981' if obj.score >= 80 else '#f59e0b' if obj.score >= 60 else '#ef4444'
        return format_html('<span style="font-weight:700;color:{}">{}</span>', colour, obj.score)
