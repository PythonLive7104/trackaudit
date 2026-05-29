from django.contrib import admin
from django.utils.html import format_html

from .models import Report, WhiteLabelConfig


# ── Report ────────────────────────────────────────────────────────────────────

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display  = ['id_short', 'account', 'workspace_name', 'status_badge',
                     'generated_by', 'share_link', 'created_at']
    list_filter   = ['status']
    search_fields = ['account__account_name', 'workspace__name', 'generated_by__email']
    date_hierarchy = 'created_at'
    list_per_page  = 25
    list_select_related = ['account', 'workspace', 'generated_by', 'audit_run']
    show_full_result_count = False
    readonly_fields = ['id', 'share_token', 'created_at', 'share_link']
    save_on_top = True

    fieldsets = (
        (None,      {'fields': ('id', 'workspace', 'account', 'audit_run', 'generated_by', 'status')}),
        ('Output',  {'fields': ('pdf_url',)}),
        ('Sharing', {'fields': ('share_token', 'share_link', 'share_link_expires_at')}),
        ('Timestamps', {'fields': ('created_at',), 'classes': ('collapse',)}),
    )

    def has_add_permission(self, request):
        return False

    @admin.display(description='ID')
    def id_short(self, obj):
        return str(obj.id)[:8] + '…'

    @admin.display(description='Workspace', ordering='workspace__name')
    def workspace_name(self, obj):
        return obj.workspace.name

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {'generating': '#3b82f6', 'ready': '#10b981', 'failed': '#ef4444'}
        colour = colours.get(obj.status, '#6b7280')
        return format_html(
            '<span style="display:inline-block;padding:1px 8px;border-radius:4px;'
            'background:{};color:#fff;font-size:11px;font-weight:600">{}</span>',
            colour, obj.get_status_display(),
        )

    @admin.display(description='Share Link')
    def share_link(self, obj):
        if not obj.share_token:
            return '—'
        url = f'/reports/share/{obj.share_token}/'
        return format_html('<a href="{}" target="_blank">Open ↗</a>', url)


# ── WhiteLabelConfig ──────────────────────────────────────────────────────────

@admin.register(WhiteLabelConfig)
class WhiteLabelConfigAdmin(admin.ModelAdmin):
    list_display  = ['workspace', 'agency_name', 'colour_swatch', 'custom_domain', 'updated_at']
    search_fields = ['workspace__name', 'agency_name', 'custom_domain']
    list_select_related = ['workspace']
    list_per_page  = 30
    readonly_fields = ['updated_at']

    @admin.display(description='Brand Colour')
    def colour_swatch(self, obj):
        if not obj.primary_color:
            return '—'
        return format_html(
            '<span style="display:inline-block;width:18px;height:18px;border-radius:4px;'
            'background:{};vertical-align:middle;margin-right:6px;border:1px solid #ccc"></span>{}',
            obj.primary_color, obj.primary_color,
        )
