from django.contrib import admin
from django.db.models import Count
from django.utils import timezone
from django.utils.html import format_html

from .models import GoogleAdsConnection, HubSpotIntegration, MonitoredAccount, SlackIntegration


# ── Inlines ───────────────────────────────────────────────────────────────────

class MonitoredAccountInline(admin.TabularInline):
    model           = MonitoredAccount
    extra           = 0
    fields          = ['account_name', 'google_ads_customer_id', 'status', 'currency_code']
    readonly_fields = ['account_name', 'google_ads_customer_id', 'currency_code']
    show_change_link = True

    def has_add_permission(self, request, obj=None):
        return False


# ── GoogleAdsConnection ───────────────────────────────────────────────────────

@admin.register(GoogleAdsConnection)
class GoogleAdsConnectionAdmin(admin.ModelAdmin):
    list_display  = ['google_account_email', 'workspace', 'active_badge', 'token_status', 'account_count', 'created_at']
    list_filter   = ['is_active']
    search_fields = ['google_account_email', 'workspace__name']
    date_hierarchy = 'created_at'
    list_per_page  = 30
    list_select_related = ['workspace']
    show_full_result_count = False
    readonly_fields = ['id', 'created_at', 'updated_at', 'token_expires_at']
    inlines = [MonitoredAccountInline]

    fieldsets = (
        (None,         {'fields': ('id', 'workspace', 'google_account_email', 'is_active')}),
        ('Token',      {'fields': ('token_expires_at',), 'classes': ('collapse',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _account_count=Count('monitored_accounts', distinct=True),
        )

    @admin.display(description='Active', boolean=True, ordering='is_active')
    def active_badge(self, obj):
        return obj.is_active

    @admin.display(description='Token')
    def token_status(self, obj):
        if obj.is_token_expired:
            return format_html('<span style="color:#ef4444;font-weight:600">Expired</span>')
        return format_html('<span style="color:#10b981;font-weight:600">Valid</span>')

    @admin.display(description='Accounts', ordering='_account_count')
    def account_count(self, obj):
        return obj._account_count


# ── MonitoredAccount ──────────────────────────────────────────────────────────

@admin.register(MonitoredAccount)
class MonitoredAccountAdmin(admin.ModelAdmin):
    list_display  = ['account_name', 'google_ads_customer_id', 'workspace', 'status_badge',
                     'currency_code', 'latest_health_score', 'created_at']
    list_filter   = ['status', 'currency_code', 'is_manager_account']
    search_fields = ['account_name', 'google_ads_customer_id', 'workspace__name']
    date_hierarchy = 'created_at'
    list_per_page  = 30
    list_select_related = ['workspace', 'connection']
    show_full_result_count = False
    readonly_fields = ['id', 'created_at', 'updated_at']
    save_on_top = True

    fieldsets = (
        (None,         {'fields': ('id', 'workspace', 'connection', 'account_name',
                                   'google_ads_customer_id', 'status')}),
        ('Details',    {'fields': ('currency_code', 'time_zone', 'is_manager_account')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {'active': '#10b981', 'paused': '#f59e0b', 'error': '#ef4444'}
        colour = colours.get(obj.status, '#6b7280')
        return format_html(
            '<span style="display:inline-block;padding:1px 8px;border-radius:4px;'
            'background:{};color:#fff;font-size:11px;font-weight:600">{}</span>',
            colour, obj.get_status_display(),
        )

    @admin.display(description='Health Score')
    def latest_health_score(self, obj):
        record = obj.health_scores.order_by('-recorded_at').first()
        if record is None:
            return '—'
        colour = '#10b981' if record.score >= 80 else '#f59e0b' if record.score >= 60 else '#ef4444'
        return format_html('<span style="font-weight:700;color:{}">{}</span>', colour, record.score)

    actions = ['pause_accounts', 'activate_accounts']

    @admin.action(description='Pause selected accounts')
    def pause_accounts(self, request, queryset):
        queryset.update(status=MonitoredAccount.STATUS_PAUSED)
        self.message_user(request, 'Selected accounts paused.')

    @admin.action(description='Activate selected accounts')
    def activate_accounts(self, request, queryset):
        queryset.update(status=MonitoredAccount.STATUS_ACTIVE)
        self.message_user(request, 'Selected accounts activated.')


# ── SlackIntegration ──────────────────────────────────────────────────────────

@admin.register(SlackIntegration)
class SlackIntegrationAdmin(admin.ModelAdmin):
    list_display  = ['workspace', 'slack_workspace_name', 'channel_name', 'active_badge', 'created_at']
    list_filter   = ['is_active']
    search_fields = ['workspace__name', 'slack_workspace_name', 'channel_name']
    list_select_related = ['workspace']
    list_per_page  = 30
    readonly_fields = ['id', 'created_at', 'slack_workspace_id', 'channel_id']

    @admin.display(description='Active', boolean=True, ordering='is_active')
    def active_badge(self, obj):
        return obj.is_active


# ── HubSpotIntegration ────────────────────────────────────────────────────────

@admin.register(HubSpotIntegration)
class HubSpotIntegrationAdmin(admin.ModelAdmin):
    list_display  = ['workspace', 'portal_id', 'active_badge', 'created_at']
    list_filter   = ['is_active']
    search_fields = ['workspace__name', 'portal_id']
    list_select_related = ['workspace']
    list_per_page  = 30
    readonly_fields = ['id', 'created_at', 'token_expires_at']

    @admin.display(description='Active', boolean=True, ordering='is_active')
    def active_badge(self, obj):
        return obj.is_active
