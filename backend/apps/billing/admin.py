from django.contrib import admin
from django.utils.html import format_html

from .models import Invoice, Plan, Subscription


# ── Inlines ───────────────────────────────────────────────────────────────────

class InvoiceInline(admin.TabularInline):
    model           = Invoice
    extra           = 0
    fields          = ['dodo_payment_id', 'amount_col', 'currency', 'status', 'paid_at']
    readonly_fields = ['dodo_payment_id', 'amount_col', 'currency', 'status', 'paid_at']
    can_delete      = False
    show_change_link = True
    max_num         = 0

    def has_add_permission(self, request, obj=None):
        return False

    @admin.display(description='Amount')
    def amount_col(self, obj):
        return f'${obj.amount_dollars:.2f}'


# ── Plan ──────────────────────────────────────────────────────────────────────

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display  = ['name', 'tier', 'interval', 'price_display', 'max_accounts', 'max_members',
                     'white_label_enabled', 'active_badge']
    list_filter   = ['tier', 'interval', 'is_active', 'white_label_enabled']
    search_fields = ['name', 'dodo_product_id']
    list_per_page  = 20
    readonly_fields = ['dodo_product_id']

    fieldsets = (
        (None,     {'fields': ('name', 'tier', 'interval', 'price_cents', 'dodo_product_id', 'is_active')}),
        ('Limits', {'fields': ('max_accounts', 'max_members', 'white_label_enabled', 'audit_frequency_minutes')}),
    )

    @admin.display(description='Price', ordering='price_cents')
    def price_display(self, obj):
        return f'${obj.price_dollars:.2f}'

    @admin.display(description='Active', boolean=True, ordering='is_active')
    def active_badge(self, obj):
        return obj.is_active


# ── Subscription ─────────────────────────────────────────────────────────────

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display  = ['workspace', 'plan', 'status_badge', 'current_period_end', 'trial_ends_at', 'created_at']
    list_filter   = ['status', 'plan__tier', 'plan__interval']
    search_fields = ['workspace__name', 'dodo_customer_id', 'dodo_subscription_id']
    date_hierarchy = 'created_at'
    list_per_page  = 25
    list_select_related = ['workspace', 'plan']
    show_full_result_count = False
    readonly_fields = ['id', 'created_at', 'updated_at']
    inlines = [InvoiceInline]
    save_on_top = True

    fieldsets = (
        (None,              {'fields': ('id', 'workspace', 'plan', 'status')}),
        ('DodoPayments IDs',{'fields': ('dodo_customer_id', 'dodo_subscription_id'), 'classes': ('collapse',)}),
        ('Billing period',  {'fields': ('current_period_start', 'current_period_end', 'trial_ends_at', 'canceled_at')}),
        ('Timestamps',      {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {
            'active': '#10b981', 'trialing': '#3b82f6',
            'past_due': '#f59e0b', 'canceled': '#6b7280', 'unpaid': '#ef4444',
        }
        colour = colours.get(obj.status, '#6b7280')
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;border-radius:4px;'
            'background:{};color:#fff;font-size:11px;font-weight:600">{}</span>',
            colour, obj.get_status_display(),
        )


# ── Invoice ───────────────────────────────────────────────────────────────────

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display  = ['workspace', 'amount_display', 'currency', 'status_badge', 'paid_at', 'created_at']
    list_filter   = ['status', 'currency']
    search_fields = ['workspace__name', 'dodo_payment_id']
    date_hierarchy = 'created_at'
    list_per_page  = 30
    list_select_related = ['workspace', 'subscription']
    show_full_result_count = False
    readonly_fields = ['id', 'dodo_payment_id', 'created_at']

    fieldsets = (
        (None,         {'fields': ('id', 'workspace', 'subscription', 'dodo_payment_id')}),
        ('Amount',     {'fields': ('amount_cents', 'currency', 'status')}),
        ('Period',     {'fields': ('period_start', 'period_end', 'paid_at')}),
        ('Links',      {'fields': ('invoice_pdf_url',), 'classes': ('collapse',)}),
        ('Timestamps', {'fields': ('created_at',), 'classes': ('collapse',)}),
    )

    def has_add_permission(self, request):
        return False

    @admin.display(description='Amount', ordering='amount_cents')
    def amount_display(self, obj):
        return f'${obj.amount_dollars:.2f}'

    @admin.display(description='Status')
    def status_badge(self, obj):
        colours = {
            'paid': '#10b981', 'open': '#3b82f6',
            'draft': '#6b7280', 'void': '#9ca3af', 'uncollectible': '#ef4444',
        }
        colour = colours.get(obj.status, '#6b7280')
        return format_html(
            '<span style="display:inline-block;padding:1px 8px;border-radius:4px;'
            'background:{};color:#fff;font-size:11px;font-weight:600">{}</span>',
            colour, obj.get_status_display(),
        )
