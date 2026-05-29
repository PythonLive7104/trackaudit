import uuid
from django.db import models
from django.utils import timezone

from accounts.models import User
from integrations.models import MonitoredAccount


class AuditSchedule(models.Model):
    FREQUENCY_DAILY = 'daily'
    FREQUENCY_WEEKLY = 'weekly'
    FREQUENCY_CHOICES = [
        (FREQUENCY_DAILY, 'Daily'),
        (FREQUENCY_WEEKLY, 'Weekly'),
    ]

    account = models.OneToOneField(MonitoredAccount, on_delete=models.CASCADE, related_name='schedule')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default=FREQUENCY_DAILY)
    is_active = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    next_run_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'audit_schedules'

    def __str__(self):
        return f'{self.account.account_name} — {self.frequency}'


class AuditRun(models.Model):
    STATUS_QUEUED = 'queued'
    STATUS_RUNNING = 'running'
    STATUS_COMPLETED = 'completed'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_QUEUED, 'Queued'),
        (STATUS_RUNNING, 'Running'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_FAILED, 'Failed'),
    ]

    TRIGGER_MANUAL = 'manual'
    TRIGGER_SCHEDULED = 'scheduled'
    TRIGGER_CHOICES = [
        (TRIGGER_MANUAL, 'Manual'),
        (TRIGGER_SCHEDULED, 'Scheduled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(MonitoredAccount, on_delete=models.CASCADE, related_name='audit_runs')
    triggered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='triggered_audits')
    trigger_type = models.CharField(max_length=20, choices=TRIGGER_CHOICES, default=TRIGGER_MANUAL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_QUEUED)
    health_score = models.IntegerField(null=True, blank=True)
    pass_count = models.IntegerField(default=0)
    warning_count = models.IntegerField(default=0)
    critical_count = models.IntegerField(default=0)
    error_count = models.IntegerField(default=0)
    estimated_wasted_spend = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    failure_reason = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_runs'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.account.account_name} audit {self.id} ({self.status})'

    @property
    def duration_seconds(self):
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None


class AuditCheck(models.Model):
    STATUS_PASS = 'pass'
    STATUS_WARNING = 'warning'
    STATUS_CRITICAL = 'critical'
    STATUS_ERROR = 'error'
    STATUS_CHOICES = [
        (STATUS_PASS, 'Pass'),
        (STATUS_WARNING, 'Warning'),
        (STATUS_CRITICAL, 'Critical'),
        (STATUS_ERROR, 'Error'),
    ]

    SEVERITY_LOW = 'low'
    SEVERITY_MEDIUM = 'medium'
    SEVERITY_HIGH = 'high'
    SEVERITY_CRITICAL = 'critical'
    SEVERITY_CHOICES = [
        (SEVERITY_LOW, 'Low'),
        (SEVERITY_MEDIUM, 'Medium'),
        (SEVERITY_HIGH, 'High'),
        (SEVERITY_CRITICAL, 'Critical'),
    ]

    audit_run = models.ForeignKey(AuditRun, on_delete=models.CASCADE, related_name='checks')
    check_key = models.CharField(max_length=100, db_index=True)
    check_name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    finding_summary = models.TextField()
    explanation = models.TextField(blank=True)
    fix_instructions = models.TextField(blank=True)
    raw_data = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_checks'
        ordering = ['category', 'check_name']

    def __str__(self):
        return f'{self.check_name}: {self.status}'


class HealthScoreHistory(models.Model):
    account = models.ForeignKey(MonitoredAccount, on_delete=models.CASCADE, related_name='health_scores')
    audit_run = models.OneToOneField(AuditRun, on_delete=models.CASCADE, related_name='health_score_record')
    score = models.IntegerField()
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'health_score_history'
        ordering = ['-recorded_at']

    def __str__(self):
        return f'{self.account.account_name}: {self.score} at {self.recorded_at}'
