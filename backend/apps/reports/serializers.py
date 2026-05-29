from rest_framework import serializers

from .models import Report, WhiteLabelConfig


class WhiteLabelConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhiteLabelConfig
        fields = ['agency_name', 'logo_url', 'primary_color', 'custom_domain', 'updated_at']
        read_only_fields = ['updated_at']


class ReportSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.account_name', read_only=True)
    generated_by_name = serializers.CharField(source='generated_by.full_name', read_only=True)
    share_url = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            'id', 'account', 'account_name', 'audit_run', 'generated_by',
            'generated_by_name', 'status', 'pdf_url', 'share_token',
            'share_link_expires_at', 'share_url', 'created_at',
        ]
        read_only_fields = [
            'id', 'status', 'pdf_url', 'share_token', 'share_url', 'created_at',
        ]

    def get_share_url(self, obj):
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.share_url)
        return obj.share_url


class GenerateReportSerializer(serializers.Serializer):
    account_id = serializers.UUIDField()
    audit_run_id = serializers.UUIDField(required=False, allow_null=True)
    share_link_expires_days = serializers.IntegerField(min_value=1, max_value=365, required=False, default=30)


class ShareReportSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.account_name', read_only=True)
    white_label = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = ['id', 'account_name', 'status', 'pdf_url', 'created_at', 'white_label']

    def get_white_label(self, obj):
        config = getattr(obj.workspace, 'white_label_config', None)
        if config:
            return WhiteLabelConfigSerializer(config).data
        return None
