from rest_framework import serializers
from .models import GoogleAdsConnection, MonitoredAccount, SlackIntegration, HubSpotIntegration


class GoogleAdsConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoogleAdsConnection
        fields = ['id', 'google_account_email', 'is_active', 'token_expires_at', 'created_at']
        read_only_fields = fields


class MonitoredAccountSerializer(serializers.ModelSerializer):
    latest_health_score = serializers.SerializerMethodField()
    last_audit_at = serializers.SerializerMethodField()
    connection_email = serializers.CharField(source='connection.google_account_email', read_only=True)

    class Meta:
        model = MonitoredAccount
        fields = [
            'id', 'google_ads_customer_id', 'account_name', 'currency_code',
            'time_zone', 'is_manager_account', 'status', 'connection_email',
            'latest_health_score', 'last_audit_at', 'created_at',
        ]
        read_only_fields = ['id', 'is_manager_account', 'currency_code', 'time_zone', 'created_at']

    def get_latest_health_score(self, obj):
        from audits.models import HealthScoreHistory
        latest = HealthScoreHistory.objects.filter(account=obj).order_by('-recorded_at').first()
        return latest.score if latest else None

    def get_last_audit_at(self, obj):
        from audits.models import AuditRun
        latest = AuditRun.objects.filter(
            account=obj, status=AuditRun.STATUS_COMPLETED
        ).order_by('-completed_at').first()
        return latest.completed_at if latest else None


class AddAccountSerializer(serializers.Serializer):
    connection_id = serializers.UUIDField()
    customer_ids = serializers.ListField(
        child=serializers.CharField(max_length=20),
        min_length=1,
    )

    def validate_connection_id(self, value):
        workspace = self.context['workspace']
        try:
            self._connection = GoogleAdsConnection.objects.get(id=value, workspace=workspace)
        except GoogleAdsConnection.DoesNotExist:
            raise serializers.ValidationError('Connection not found.')
        return value


class SlackIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SlackIntegration
        fields = ['id', 'slack_workspace_name', 'channel_id', 'channel_name', 'is_active', 'created_at']
        read_only_fields = fields


class HubSpotIntegrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = HubSpotIntegration
        fields = ['id', 'portal_id', 'is_active', 'created_at']
        read_only_fields = fields


class GoogleOAuthCallbackSerializer(serializers.Serializer):
    code = serializers.CharField()
    state = serializers.CharField(required=False)
