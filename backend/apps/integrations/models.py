import uuid
from django.db import models
from django.utils import timezone

from accounts.models import Workspace
from .encryption import encrypt, decrypt


class GoogleAdsConnection(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='google_ads_connections')
    google_account_email = models.EmailField()
    _access_token = models.TextField(db_column='access_token')
    _refresh_token = models.TextField(db_column='refresh_token')
    token_expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'google_ads_connections'
        unique_together = ('workspace', 'google_account_email')

    def __str__(self):
        return f'{self.google_account_email} ({self.workspace.name})'

    @property
    def access_token(self):
        return decrypt(self._access_token)

    @access_token.setter
    def access_token(self, value):
        self._access_token = encrypt(value)

    @property
    def refresh_token(self):
        return decrypt(self._refresh_token)

    @refresh_token.setter
    def refresh_token(self, value):
        self._refresh_token = encrypt(value)

    @property
    def is_token_expired(self):
        return timezone.now() >= self.token_expires_at


class MonitoredAccount(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_PAUSED = 'paused'
    STATUS_ERROR = 'error'
    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_PAUSED, 'Paused'),
        (STATUS_ERROR, 'Error'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='monitored_accounts')
    connection = models.ForeignKey(GoogleAdsConnection, on_delete=models.CASCADE, related_name='monitored_accounts')
    google_ads_customer_id = models.CharField(max_length=20)  # e.g. "123-456-7890"
    account_name = models.CharField(max_length=255)
    currency_code = models.CharField(max_length=3, default='USD')
    time_zone = models.CharField(max_length=50, default='UTC')
    is_manager_account = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'monitored_accounts'
        unique_together = ('workspace', 'google_ads_customer_id')

    def __str__(self):
        return f'{self.account_name} ({self.google_ads_customer_id})'

    @property
    def customer_id_clean(self):
        return self.google_ads_customer_id.replace('-', '')


class SlackIntegration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.OneToOneField(Workspace, on_delete=models.CASCADE, related_name='slack_integration')
    slack_workspace_name = models.CharField(max_length=255)
    slack_workspace_id = models.CharField(max_length=50)
    _access_token = models.TextField(db_column='slack_access_token')
    channel_id = models.CharField(max_length=50)
    channel_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'slack_integrations'

    def __str__(self):
        return f'Slack: {self.slack_workspace_name} → #{self.channel_name}'

    @property
    def access_token(self):
        return decrypt(self._access_token)

    @access_token.setter
    def access_token(self, value):
        self._access_token = encrypt(value)


class HubSpotIntegration(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.OneToOneField(Workspace, on_delete=models.CASCADE, related_name='hubspot_integration')
    portal_id = models.CharField(max_length=20)
    _access_token = models.TextField(db_column='hubspot_access_token')
    _refresh_token = models.TextField(db_column='hubspot_refresh_token')
    token_expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'hubspot_integrations'

    @property
    def access_token(self):
        return decrypt(self._access_token)

    @access_token.setter
    def access_token(self, value):
        self._access_token = encrypt(value)

    @property
    def refresh_token(self):
        return decrypt(self._refresh_token)

    @refresh_token.setter
    def refresh_token(self, value):
        self._refresh_token = encrypt(value)
