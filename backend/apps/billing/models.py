import uuid
from django.db import models

from accounts.models import Workspace


class Plan(models.Model):
    INTERVAL_MONTHLY = 'monthly'
    INTERVAL_ANNUAL = 'annual'
    INTERVAL_CHOICES = [
        (INTERVAL_MONTHLY, 'Monthly'),
        (INTERVAL_ANNUAL, 'Annual'),
    ]

    TIER_STARTER = 'starter'
    TIER_AGENCY = 'agency'
    TIER_AGENCY_PRO = 'agency_pro'
    TIER_CHOICES = [
        (TIER_STARTER, 'Starter'),
        (TIER_AGENCY, 'Agency'),
        (TIER_AGENCY_PRO, 'Agency Pro'),
    ]

    name = models.CharField(max_length=100)
    tier = models.CharField(max_length=20, choices=TIER_CHOICES)
    interval = models.CharField(max_length=10, choices=INTERVAL_CHOICES, default=INTERVAL_MONTHLY)
    price_cents = models.PositiveIntegerField()
    dodo_product_id = models.CharField(max_length=255, unique=True)
    max_accounts = models.PositiveIntegerField(default=5)
    max_members = models.PositiveIntegerField(default=3)
    white_label_enabled = models.BooleanField(default=False)
    audit_frequency_minutes = models.PositiveIntegerField(default=1440)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'billing_plans'
        unique_together = [('tier', 'interval')]

    def __str__(self):
        return f'{self.name} ({self.interval})'

    @property
    def price_dollars(self):
        return self.price_cents / 100


class Subscription(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_TRIALING = 'trialing'
    STATUS_PAST_DUE = 'past_due'
    STATUS_CANCELED = 'canceled'
    STATUS_UNPAID = 'unpaid'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_TRIALING, 'Trialing'),
        (STATUS_PAST_DUE, 'Past Due'),
        (STATUS_CANCELED, 'Canceled'),
        (STATUS_UNPAID, 'Unpaid'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.OneToOneField(Workspace, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name='subscriptions')
    dodo_customer_id = models.CharField(max_length=255, db_index=True)
    dodo_subscription_id = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_TRIALING)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    trial_ends_at = models.DateTimeField(null=True, blank=True)
    canceled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'billing_subscriptions'

    def __str__(self):
        return f'{self.workspace.name} — {self.plan.name} ({self.status})'

    @property
    def is_active(self):
        return self.status in (self.STATUS_ACTIVE, self.STATUS_TRIALING)


class Invoice(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_OPEN = 'open'
    STATUS_PAID = 'paid'
    STATUS_VOID = 'void'
    STATUS_UNCOLLECTIBLE = 'uncollectible'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_OPEN, 'Open'),
        (STATUS_PAID, 'Paid'),
        (STATUS_VOID, 'Void'),
        (STATUS_UNCOLLECTIBLE, 'Uncollectible'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='invoices')
    subscription = models.ForeignKey(
        Subscription, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='invoices',
    )
    dodo_payment_id = models.CharField(max_length=255, unique=True)
    amount_cents = models.PositiveIntegerField()
    currency = models.CharField(max_length=3, default='usd')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    invoice_pdf_url = models.URLField(blank=True)
    period_start = models.DateTimeField(null=True, blank=True)
    period_end = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'billing_invoices'
        ordering = ['-created_at']

    def __str__(self):
        return f'Invoice {self.dodo_payment_id} — {self.workspace.name}'

    @property
    def amount_dollars(self):
        return self.amount_cents / 100
