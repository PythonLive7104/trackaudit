from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Workspace
from integrations.models import MonitoredAccount
from .models import Alert, NotificationPreference, AccountAlertOverride
from .serializers import (
    AlertSerializer, SnoozeAlertSerializer, ResolveAlertSerializer,
    NotificationPreferenceSerializer, AccountAlertOverrideSerializer,
)


def get_workspace(request, workspace_id):
    return Workspace.objects.get(id=workspace_id, members__user=request.user)


class AlertListView(generics.ListAPIView):
    serializer_class = AlertSerializer

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        qs = Alert.objects.filter(workspace=workspace).select_related('account', 'resolved_by')

        severity = self.request.query_params.get('severity')
        if severity:
            qs = qs.filter(severity=severity)

        alert_status = self.request.query_params.get('status')
        if alert_status:
            qs = qs.filter(status=alert_status)

        account_id = self.request.query_params.get('account_id')
        if account_id:
            qs = qs.filter(account_id=account_id)

        return qs


class AlertDetailView(generics.RetrieveAPIView):
    serializer_class = AlertSerializer

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        return Alert.objects.filter(workspace=workspace)


class SnoozeAlertView(APIView):
    def post(self, request, workspace_id, pk):
        workspace = get_workspace(request, workspace_id)
        alert = Alert.objects.get(id=pk, workspace=workspace)

        serializer = SnoozeAlertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        alert.snooze(serializer.get_snooze_until())
        return Response(AlertSerializer(alert).data)


class ResolveAlertView(APIView):
    def post(self, request, workspace_id, pk):
        workspace = get_workspace(request, workspace_id)
        alert = Alert.objects.get(id=pk, workspace=workspace)

        serializer = ResolveAlertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        alert.resolve(request.user, note=serializer.validated_data.get('note', ''))
        return Response(AlertSerializer(alert).data)


class AlertStatsView(APIView):
    def get(self, request, workspace_id):
        workspace = get_workspace(request, workspace_id)
        open_alerts = Alert.objects.filter(workspace=workspace, status=Alert.STATUS_OPEN)
        return Response({
            'total_open': open_alerts.count(),
            'critical': open_alerts.filter(severity=Alert.SEVERITY_CRITICAL).count(),
            'warning': open_alerts.filter(severity=Alert.SEVERITY_WARNING).count(),
            'info': open_alerts.filter(severity=Alert.SEVERITY_INFO).count(),
        })


class NotificationPreferenceView(generics.RetrieveUpdateAPIView):
    serializer_class = NotificationPreferenceSerializer

    def get_object(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        prefs, _ = NotificationPreference.objects.get_or_create(workspace=workspace)
        return prefs


class AccountAlertOverrideListView(generics.ListAPIView):
    serializer_class = AccountAlertOverrideSerializer

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        return AccountAlertOverride.objects.filter(workspace=workspace).select_related('account')


class AccountAlertOverrideView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AccountAlertOverrideSerializer

    def get_object(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        account = MonitoredAccount.objects.get(id=self.kwargs['account_id'], workspace=workspace)
        override, _ = AccountAlertOverride.objects.get_or_create(workspace=workspace, account=account)
        return override
