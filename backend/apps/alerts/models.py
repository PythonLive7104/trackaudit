import uuid
from django.db import models
from django.utils import timezone

from accounts.models import User, Workspace
from integrations.models import MonitoredAccount


class Alert(models.Model):
    STATUS_OPEN = 'open'
    STATUS_SNOOZED = 'snoozed'
    STATUS_RESOLVED = 'resolved'
    STATUS_CHOICES = [
        (STATUS_OPEN, 'Open'),
        (STATUS_SNOOZED, 'Snoozed'),
        (STATUS_RESOLVED, 'Resolved'),
    ]

    SEVERITY_INFO = 'info'
    SEVERITY_WARNING = 'warning'
    SEVERITY_CRITICAL = 'critical'
    SEVERITY_CHOICES = [
        (SEVERITY_INFO, 'Info'),
        (SEVERITY_WARNING, 'Warning'),
        (SEVERITY_CRITICAL, 'Critical'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='alerts')
    account = models.ForeignKey(MonitoredAccount, on_delete=models.CASCADE, related_name='alerts')
    audit_check = models.ForeignKey(
        'audits.AuditCheck', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='alerts',
    )
    check_key = models.CharField(max_length=100, db_index=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    snoozed_until = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_alerts',
    )
    resolve_note = models.TextField(blank=True)
    first_detected_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'alerts'
        ordering = ['-first_detected_at']

    def __str__(self):
        return f'[{self.severity.upper()}] {self.title} — {self.account.account_name}'

    def snooze(self, until):
        self.status = self.STATUS_SNOOZED
        self.snoozed_until = until
        self.save(update_fields=['status', 'snoozed_until'])

    def resolve(self, user, note=''):
        self.status = self.STATUS_RESOLVED
        self.resolved_at = timezone.now()
        self.resolved_by = user
        self.resolve_note = note
        self.save(update_fields=['status', 'resolved_at', 'resolved_by', 'resolve_note'])


class AlertDelivery(models.Model):
    CHANNEL_EMAIL = 'email'
    CHANNEL_SLACK = 'slack'
    CHANNEL_WEBHOOK = 'webhook'
    CHANNEL_CHOICES = [
        (CHANNEL_EMAIL, 'Email'),
        (CHANNEL_SLACK, 'Slack'),
        (CHANNEL_WEBHOOK, 'Webhook'),
    ]

    STATUS_PENDING = 'pending'
    STATUS_SENT = 'sent'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_SENT, 'Sent'),
        (STATUS_FAILED, 'Failed'),
    ]

    alert = models.ForeignKey(Alert, on_delete=models.CASCADE, related_name='deliveries')
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    recipient = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'alert_deliveries'
        ordering = ['-created_at']


class NotificationPreference(models.Model):
    workspace = models.OneToOneField(Workspace, on_delete=models.CASCADE, related_name='notification_preferences')
    email_enabled = models.BooleanField(default=True)
    slack_enabled = models.BooleanField(default=False)
    webhook_url = models.URLField(blank=True)
    min_severity = models.CharField(
        max_length=20,
        choices=Alert.SEVERITY_CHOICES,
        default=Alert.SEVERITY_WARNING,
    )
    daily_digest_enabled = models.BooleanField(default=True)
    daily_digest_hour = models.IntegerField(default=8)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notification_preferences'


class AccountAlertOverride(models.Model):
    """Per-account alert delivery overrides that take precedence over workspace preferences."""

    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='account_alert_overrides')
    account = models.ForeignKey(MonitoredAccount, on_delete=models.CASCADE, related_name='alert_overrides')
    is_muted = models.BooleanField(default=False, help_text='Suppress all alert delivery for this account.')
    min_severity_override = models.CharField(
        max_length=20,
        choices=Alert.SEVERITY_CHOICES,
        blank=True,
        help_text='Leave blank to inherit workspace default.',
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'account_alert_overrides'
        unique_together = ('workspace', 'account')

    def __str__(self):
        if self.is_muted:
            return f'{self.account.account_name}: muted'
        return f'{self.account.account_name}: min_severity={self.min_severity_override or "default"}'

    def effective_min_severity(self, workspace_default: str) -> str:
        return self.min_severity_override or workspace_default
