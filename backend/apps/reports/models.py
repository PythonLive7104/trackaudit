import uuid
from django.db import models

from accounts.models import User, Workspace
from integrations.models import MonitoredAccount


class WhiteLabelConfig(models.Model):
    workspace = models.OneToOneField(Workspace, on_delete=models.CASCADE, related_name='white_label_config')
    agency_name = models.CharField(max_length=255, blank=True)
    logo_url = models.URLField(blank=True)
    primary_color = models.CharField(max_length=7, default='#3B82F6')  # hex
    custom_domain = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'white_label_configs'

    def __str__(self):
        return f'White-label: {self.workspace.name}'


class Report(models.Model):
    STATUS_GENERATING = 'generating'
    STATUS_READY = 'ready'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_GENERATING, 'Generating'),
        (STATUS_READY, 'Ready'),
        (STATUS_FAILED, 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='reports')
    account = models.ForeignKey(MonitoredAccount, on_delete=models.CASCADE, related_name='reports')
    audit_run = models.ForeignKey(
        'audits.AuditRun', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='reports',
    )
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='generated_reports')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_GENERATING)
    pdf_url = models.URLField(blank=True)
    share_token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    share_link_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reports'
        ordering = ['-created_at']

    def __str__(self):
        return f'Report for {self.account.account_name} ({self.created_at.date()})'

    @property
    def share_url(self):
        return f'/api/reports/share/{self.share_token}/'
