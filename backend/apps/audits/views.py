import logging
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Workspace
from integrations.models import MonitoredAccount
from .models import AuditRun, AuditCheck, AuditSchedule, HealthScoreHistory
from .serializers import (
    AuditRunSerializer, AuditRunDetailSerializer, AuditCheckSerializer,
    TriggerAuditSerializer, AuditScheduleSerializer, HealthScoreHistorySerializer,
)
from .tasks import run_audit_task

logger = logging.getLogger(__name__)


def get_workspace(request, workspace_id):
    return Workspace.objects.get(id=workspace_id, members__user=request.user)


class TriggerAuditView(APIView):
    def post(self, request, workspace_id):
        workspace = get_workspace(request, workspace_id)
        serializer = TriggerAuditSerializer(data=request.data, context={'workspace': workspace})
        serializer.is_valid(raise_exception=True)

        account = MonitoredAccount.objects.get(
            id=serializer.validated_data['account_id'],
            workspace=workspace,
        )

        # Check no audit is already running for this account
        running = AuditRun.objects.filter(
            account=account,
            status__in=[AuditRun.STATUS_QUEUED, AuditRun.STATUS_RUNNING],
        ).exists()
        if running:
            return Response(
                {'detail': 'An audit is already in progress for this account.'},
                status=status.HTTP_409_CONFLICT,
            )

        audit_run = AuditRun.objects.create(
            account=account,
            triggered_by=request.user,
            trigger_type=AuditRun.TRIGGER_MANUAL,
        )
        run_audit_task.delay(str(audit_run.id))

        return Response(AuditRunSerializer(audit_run).data, status=status.HTTP_202_ACCEPTED)


class AuditRunListView(generics.ListAPIView):
    serializer_class = AuditRunSerializer

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        qs = AuditRun.objects.filter(account__workspace=workspace).select_related('account', 'triggered_by')

        account_id = self.request.query_params.get('account_id')
        if account_id:
            qs = qs.filter(account_id=account_id)
        return qs


class AuditRunDetailView(generics.RetrieveAPIView):
    serializer_class = AuditRunDetailSerializer

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        return AuditRun.objects.filter(account__workspace=workspace).prefetch_related('checks')


class AuditCheckListView(generics.ListAPIView):
    serializer_class = AuditCheckSerializer
    pagination_class = None

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        return AuditCheck.objects.filter(
            audit_run_id=self.kwargs['run_id'],
            audit_run__account__workspace=workspace,
        )


class AuditScheduleView(generics.RetrieveUpdateAPIView):
    serializer_class = AuditScheduleSerializer

    def get_object(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        account = MonitoredAccount.objects.get(id=self.kwargs['account_id'], workspace=workspace)
        schedule, _ = AuditSchedule.objects.get_or_create(account=account)
        return schedule


class WorkspaceScheduleListView(generics.ListAPIView):
    """All schedules for a workspace — powers the Monitoring page schedule table."""
    serializer_class = AuditScheduleSerializer
    pagination_class = None

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        return (
            AuditSchedule.objects.filter(account__workspace=workspace)
            .select_related('account')
            .order_by('account__account_name')
        )


class WorkspaceScheduleDetailView(generics.RetrieveUpdateAPIView):
    """Get or update a specific schedule by its PK (workspace-scoped)."""
    serializer_class = AuditScheduleSerializer

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        return AuditSchedule.objects.filter(account__workspace=workspace)


class HealthScoreHistoryView(generics.ListAPIView):
    serializer_class = HealthScoreHistorySerializer

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        account = MonitoredAccount.objects.get(id=self.kwargs['account_id'], workspace=workspace)
        return HealthScoreHistory.objects.filter(account=account).order_by('-recorded_at')[:90]


class DashboardStatsView(APIView):
    def get(self, request, workspace_id):
        workspace = get_workspace(request, workspace_id)
        accounts = MonitoredAccount.objects.filter(workspace=workspace)

        from alerts.models import Alert
        from django.db.models import Avg

        total_accounts = accounts.count()
        critical_alerts = Alert.objects.filter(
            workspace=workspace,
            status=Alert.STATUS_OPEN,
            severity=Alert.SEVERITY_CRITICAL,
        ).count()

        # Latest health scores per account
        latest_scores = []
        for account in accounts:
            latest = HealthScoreHistory.objects.filter(account=account).order_by('-recorded_at').first()
            if latest:
                latest_scores.append(latest.score)

        avg_health_score = round(sum(latest_scores) / len(latest_scores)) if latest_scores else None
        healthy_accounts = sum(1 for s in latest_scores if s >= 80)

        return Response({
            'total_accounts': total_accounts,
            'healthy_accounts': healthy_accounts,
            'critical_alerts': critical_alerts,
            'avg_health_score': avg_health_score,
        })
