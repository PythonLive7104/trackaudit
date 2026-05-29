from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Workspace
from integrations.models import MonitoredAccount
from .models import Report, WhiteLabelConfig
from .serializers import (
    GenerateReportSerializer, ReportSerializer,
    ShareReportSerializer, WhiteLabelConfigSerializer,
)
from .tasks import generate_report_task


def get_workspace(request, workspace_id):
    return Workspace.objects.get(id=workspace_id, members__user=request.user)


class ReportListView(generics.ListAPIView):
    serializer_class = ReportSerializer

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        qs = Report.objects.filter(workspace=workspace).select_related('account', 'generated_by')

        account_id = self.request.query_params.get('account_id')
        if account_id:
            qs = qs.filter(account_id=account_id)

        return qs


class GenerateReportView(APIView):
    def post(self, request, workspace_id):
        workspace = get_workspace(request, workspace_id)

        serializer = GenerateReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        account = MonitoredAccount.objects.get(
            id=data['account_id'],
            workspace=workspace,
        )

        expires_days = data.get('share_link_expires_days', 30)
        report = Report.objects.create(
            workspace=workspace,
            account=account,
            audit_run_id=data.get('audit_run_id'),
            generated_by=request.user,
            share_link_expires_at=timezone.now() + timedelta(days=expires_days),
        )

        generate_report_task.delay(str(report.id))

        return Response(
            ReportSerializer(report, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class ReportDetailView(generics.RetrieveAPIView):
    serializer_class = ReportSerializer

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        return Report.objects.filter(workspace=workspace)


class SharedReportView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, share_token):
        try:
            report = Report.objects.select_related('workspace', 'account').get(
                share_token=share_token,
                status=Report.STATUS_READY,
            )
        except Report.DoesNotExist:
            return Response({'detail': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)

        if report.share_link_expires_at and report.share_link_expires_at < timezone.now():
            return Response({'detail': 'This share link has expired.'}, status=status.HTTP_410_GONE)

        return Response(ShareReportSerializer(report).data)


class WhiteLabelConfigView(generics.RetrieveUpdateAPIView):
    serializer_class = WhiteLabelConfigSerializer

    def get_object(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        config, _ = WhiteLabelConfig.objects.get_or_create(workspace=workspace)
        return config
