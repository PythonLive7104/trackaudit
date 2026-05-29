import logging
from datetime import timedelta

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Workspace
from accounts.permissions import user_is_workspace_admin
from .models import GoogleAdsConnection, MonitoredAccount, SlackIntegration
from .serializers import (
    GoogleAdsConnectionSerializer, MonitoredAccountSerializer, AddAccountSerializer,
    SlackIntegrationSerializer, GoogleOAuthCallbackSerializer,
)

logger = logging.getLogger(__name__)

GOOGLE_ADS_SCOPES = [
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/userinfo.email',
]


def get_workspace(request, workspace_id):
    return Workspace.objects.get(id=workspace_id, members__user=request.user)


# ── Google Ads OAuth ─────────────────────────────────────────────────────────

class GoogleAdsOAuthInitView(APIView):
    """Returns the Google OAuth URL the frontend should redirect to."""

    def get(self, request, workspace_id):
        workspace = get_workspace(request, workspace_id)
        import urllib.parse
        params = {
            'client_id': settings.GOOGLE_CLIENT_ID,
            'redirect_uri': f'{settings.FRONTEND_URL}/integrations/google-ads/callback',
            'response_type': 'code',
            'scope': ' '.join(GOOGLE_ADS_SCOPES),
            'access_type': 'offline',
            'prompt': 'consent',
            'state': str(workspace.id),
        }
        url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode(params)
        return Response({'auth_url': url})


class GoogleAdsOAuthCallbackView(APIView):
    """Exchanges the OAuth code, stores tokens, discovers accounts."""

    def post(self, request, workspace_id):
        workspace = get_workspace(request, workspace_id)
        serializer = GoogleOAuthCallbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data['code']

        try:
            tokens = self._exchange_code(code)
            user_info = self._get_user_info(tokens['access_token'])
        except Exception as e:
            logger.error('Google Ads OAuth exchange failed: %s', e)
            return Response({'detail': 'OAuth exchange failed.'}, status=status.HTTP_400_BAD_REQUEST)

        expires_at = timezone.now() + timedelta(seconds=tokens.get('expires_in', 3600))
        conn, _ = GoogleAdsConnection.objects.update_or_create(
            workspace=workspace,
            google_account_email=user_info['email'],
            defaults={'token_expires_at': expires_at, 'is_active': True},
        )
        conn.access_token = tokens['access_token']
        conn.refresh_token = tokens.get('refresh_token', '')
        conn.save()

        return Response(GoogleAdsConnectionSerializer(conn).data, status=status.HTTP_201_CREATED)

    def _exchange_code(self, code):
        resp = requests.post('https://oauth2.googleapis.com/token', data={
            'code': code,
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'redirect_uri': f'{settings.FRONTEND_URL}/integrations/google-ads/callback',
            'grant_type': 'authorization_code',
        })
        resp.raise_for_status()
        return resp.json()

    def _get_user_info(self, access_token):
        resp = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
        )
        resp.raise_for_status()
        return resp.json()


class GoogleAdsConnectionListView(generics.ListAPIView):
    serializer_class = GoogleAdsConnectionSerializer
    pagination_class = None

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        return GoogleAdsConnection.objects.filter(workspace=workspace).order_by('-created_at')


class GoogleAdsConnectionDeleteView(generics.DestroyAPIView):
    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        return GoogleAdsConnection.objects.filter(workspace=workspace)

    def destroy(self, request, *args, **kwargs):
        conn = self.get_object()
        if not user_is_workspace_admin(request.user, conn.workspace):
            return Response({'detail': 'Admin required.'}, status=status.HTTP_403_FORBIDDEN)

        # Revoke the Google OAuth token so it can't be reused
        try:
            requests.post(
                'https://oauth2.googleapis.com/revoke',
                params={'token': conn.access_token},
                timeout=5,
            )
        except Exception as e:
            logger.warning('Google token revocation failed for connection %s: %s', conn.id, e)

        # Mark monitored accounts as error before cascade delete preserves the state change in logs
        conn.monitored_accounts.update(status=MonitoredAccount.STATUS_ERROR)

        conn.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GoogleAdsReauthorizeView(APIView):
    """Marks a stale connection as inactive and returns a fresh OAuth URL."""

    def post(self, request, workspace_id, pk):
        workspace = get_workspace(request, workspace_id)
        try:
            conn = GoogleAdsConnection.objects.get(id=pk, workspace=workspace)
        except GoogleAdsConnection.DoesNotExist:
            return Response({'detail': 'Connection not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not user_is_workspace_admin(request.user, workspace):
            return Response({'detail': 'Admin required.'}, status=status.HTTP_403_FORBIDDEN)

        conn.is_active = False
        conn.save(update_fields=['is_active'])
        conn.monitored_accounts.update(status=MonitoredAccount.STATUS_ERROR)

        import urllib.parse
        params = {
            'client_id': settings.GOOGLE_CLIENT_ID,
            'redirect_uri': f'{settings.FRONTEND_URL}/integrations/google-ads/callback',
            'response_type': 'code',
            'scope': ' '.join(GOOGLE_ADS_SCOPES),
            'access_type': 'offline',
            'prompt': 'consent',
            'state': str(workspace.id),
            'login_hint': conn.google_account_email,
        }
        auth_url = 'https://accounts.google.com/o/oauth2/v2/auth?' + urllib.parse.urlencode(params)
        return Response({'auth_url': auth_url, 'connection_id': str(conn.id)})


# ── Discover accounts from Google Ads API ───────────────────────────────────

class DiscoverAccountsView(APIView):
    """Queries the Google Ads API to list all accessible accounts for a connection."""

    def get(self, request, workspace_id, connection_id):
        workspace = get_workspace(request, workspace_id)
        try:
            conn = GoogleAdsConnection.objects.get(id=connection_id, workspace=workspace)
        except GoogleAdsConnection.DoesNotExist:
            return Response({'detail': 'Connection not found.'}, status=status.HTTP_404_NOT_FOUND)

        from .google_ads.client import GoogleAdsClient
        client = GoogleAdsClient(refresh_token=conn.refresh_token)

        try:
            accounts = client.get_accessible_customers()
        except Exception as e:
            logger.error('Failed to discover accounts for %s: %s', connection_id, e)
            return Response({'detail': 'Could not fetch accounts from Google Ads.'}, status=status.HTTP_502_BAD_GATEWAY)

        already_added = set(
            MonitoredAccount.objects.filter(workspace=workspace).values_list('google_ads_customer_id', flat=True)
        )
        return Response([
            {
                'customer_id': a.customer_id,
                'name': a.name,
                'currency_code': a.currency_code,
                'time_zone': a.time_zone,
                'is_manager': a.is_manager,
                'already_added': a.customer_id in already_added,
            }
            for a in accounts
        ])


# ── Monitored accounts ───────────────────────────────────────────────────────

class MonitoredAccountListCreateView(generics.ListCreateAPIView):
    serializer_class = MonitoredAccountSerializer

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        return MonitoredAccount.objects.filter(workspace=workspace).select_related('connection')

    def create(self, request, *args, **kwargs):
        workspace = get_workspace(request, kwargs['workspace_id'])
        serializer = AddAccountSerializer(data=request.data, context={'workspace': workspace})
        serializer.is_valid(raise_exception=True)

        # Enforce plan account limit
        customer_ids = serializer.validated_data['customer_ids']
        current_count = MonitoredAccount.objects.filter(workspace=workspace).count()
        try:
            max_accounts = workspace.subscription.plan.max_accounts
        except Exception:
            max_accounts = 5  # Default for workspaces without a subscription

        if current_count + len(customer_ids) > max_accounts:
            remaining = max(0, max_accounts - current_count)
            return Response(
                {
                    'detail': (
                        f'Plan limit reached. Your plan allows {max_accounts} monitored accounts '
                        f'({current_count} active). You can add {remaining} more. '
                        f'Upgrade your plan to add more accounts.'
                    )
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        from .google_ads.client import GoogleAdsClient
        conn = GoogleAdsConnection.objects.get(id=serializer.validated_data['connection_id'], workspace=workspace)
        client = GoogleAdsClient(refresh_token=conn.refresh_token)

        created_accounts = []
        for customer_id in serializer.validated_data['customer_ids']:
            try:
                info = client._fetch_account_info(customer_id.replace('-', ''))
                account, created = MonitoredAccount.objects.get_or_create(
                    workspace=workspace,
                    google_ads_customer_id=customer_id,
                    defaults={
                        'connection': conn,
                        'account_name': info.name,
                        'currency_code': info.currency_code,
                        'time_zone': info.time_zone,
                        'is_manager_account': info.is_manager,
                    },
                )
                created_accounts.append(account)
            except Exception as e:
                logger.error('Failed to add account %s: %s', customer_id, e)

        return Response(
            MonitoredAccountSerializer(created_accounts, many=True).data,
            status=status.HTTP_201_CREATED,
        )


class MonitoredAccountDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MonitoredAccountSerializer

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        return MonitoredAccount.objects.filter(workspace=workspace)


# ── Slack integration ────────────────────────────────────────────────────────

class SlackOAuthCallbackView(APIView):
    def post(self, request, workspace_id):
        workspace = get_workspace(request, workspace_id)
        code = request.data.get('code')
        if not code:
            return Response({'detail': 'code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        resp = requests.post('https://slack.com/api/oauth.v2.access', data={
            'code': code,
            'client_id': settings.SLACK_CLIENT_ID,
            'client_secret': settings.SLACK_CLIENT_SECRET,
            'redirect_uri': f'{settings.FRONTEND_URL}/integrations/slack/callback',
        })
        data = resp.json()
        if not data.get('ok'):
            return Response({'detail': data.get('error', 'Slack auth failed.')}, status=status.HTTP_400_BAD_REQUEST)

        integration, _ = SlackIntegration.objects.update_or_create(
            workspace=workspace,
            defaults={
                'slack_workspace_name': data['team']['name'],
                'slack_workspace_id': data['team']['id'],
                'channel_id': data['incoming_webhook']['channel_id'],
                'channel_name': data['incoming_webhook']['channel'],
                'is_active': True,
            },
        )
        integration.access_token = data['access_token']
        integration.save()
        return Response(SlackIntegrationSerializer(integration).data)


class SlackIntegrationView(generics.RetrieveDestroyAPIView):
    serializer_class = SlackIntegrationSerializer

    def get_object(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        try:
            return SlackIntegration.objects.get(workspace=workspace)
        except SlackIntegration.DoesNotExist:
            raise NotFound('No Slack integration found.')


# ── Integration status overview ──────────────────────────────────────────────

class IntegrationStatusView(APIView):
    def get(self, request, workspace_id):
        workspace = get_workspace(request, workspace_id)
        return Response({
            'google_ads': GoogleAdsConnection.objects.filter(workspace=workspace, is_active=True).count() > 0,
            'slack': SlackIntegration.objects.filter(workspace=workspace, is_active=True).exists(),
            'hubspot': hasattr(workspace, 'hubspot_integration') and workspace.hubspot_integration.is_active,
        })
