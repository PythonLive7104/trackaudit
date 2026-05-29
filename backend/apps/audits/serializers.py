from rest_framework import serializers
from .models import AuditRun, AuditCheck, AuditSchedule, HealthScoreHistory


class AuditCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditCheck
        fields = [
            'id', 'check_key', 'check_name', 'category',
            'status', 'severity', 'finding_summary',
            'explanation', 'fix_instructions', 'raw_data', 'created_at',
        ]


class AuditRunSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.account_name', read_only=True)
    triggered_by_name = serializers.CharField(source='triggered_by.full_name', read_only=True, default=None)

    class Meta:
        model = AuditRun
        fields = [
            'id', 'account', 'account_name', 'trigger_type', 'triggered_by_name',
            'status', 'health_score',
            'pass_count', 'warning_count', 'critical_count', 'error_count',
            'estimated_wasted_spend', 'failure_reason',
            'started_at', 'completed_at', 'created_at',
        ]
        read_only_fields = fields


class AuditRunDetailSerializer(AuditRunSerializer):
    checks = AuditCheckSerializer(many=True, read_only=True)

    class Meta(AuditRunSerializer.Meta):
        fields = AuditRunSerializer.Meta.fields + ['checks']


class TriggerAuditSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()

    def validate_account_id(self, value):
        workspace = self.context['workspace']
        from integrations.models import MonitoredAccount
        try:
            self._account = MonitoredAccount.objects.get(id=value, workspace=workspace)
        except MonitoredAccount.DoesNotExist:
            raise serializers.ValidationError('Account not found in this workspace.')
        return value


class AuditScheduleSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.account_name', read_only=True)

    class Meta:
        model = AuditSchedule
        fields = [
            'id', 'account', 'account_name', 'frequency',
            'is_active', 'last_run_at', 'next_run_at', 'created_at',
        ]
        read_only_fields = ['id', 'account', 'account_name', 'last_run_at', 'created_at']


class HealthScoreHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthScoreHistory
        fields = ['id', 'score', 'recorded_at']
