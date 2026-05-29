from django.utils import timezone
from rest_framework import serializers
from .models import Alert, AlertDelivery, NotificationPreference, AccountAlertOverride


class AlertSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.account_name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.full_name', read_only=True, default=None)

    class Meta:
        model = Alert
        fields = [
            'id', 'account', 'account_name', 'check_key',
            'severity', 'title', 'description', 'status',
            'snoozed_until', 'resolved_at', 'resolved_by_name', 'resolve_note',
            'first_detected_at', 'last_seen_at',
        ]
        read_only_fields = fields


class SnoozeAlertSerializer(serializers.Serializer):
    SNOOZE_CHOICES = ['1h', '24h', '7d', 'custom']
    duration = serializers.ChoiceField(choices=SNOOZE_CHOICES)
    until = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        if attrs['duration'] == 'custom' and not attrs.get('until'):
            raise serializers.ValidationError({'until': 'Required when duration is "custom".'})
        if attrs.get('until') and attrs['until'] <= timezone.now():
            raise serializers.ValidationError({'until': 'Must be in the future.'})
        return attrs

    def get_snooze_until(self):
        from datetime import timedelta
        durations = {'1h': timedelta(hours=1), '24h': timedelta(hours=24), '7d': timedelta(days=7)}
        if self.validated_data['duration'] == 'custom':
            return self.validated_data['until']
        return timezone.now() + durations[self.validated_data['duration']]


class ResolveAlertSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, default='')


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'email_enabled', 'slack_enabled', 'webhook_url',
            'min_severity', 'daily_digest_enabled', 'daily_digest_hour',
        ]


class AccountAlertOverrideSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.account_name', read_only=True)

    class Meta:
        model = AccountAlertOverride
        fields = ['id', 'account', 'account_name', 'is_muted', 'min_severity_override', 'updated_at']
        read_only_fields = ['id', 'account_name', 'updated_at']
