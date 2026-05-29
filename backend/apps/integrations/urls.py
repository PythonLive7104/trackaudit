from django.urls import path
from . import views

urlpatterns = [
    # Integration status
    path('workspaces/<uuid:workspace_id>/integrations/', views.IntegrationStatusView.as_view(), name='integration-status'),

    # Google Ads OAuth
    path('workspaces/<uuid:workspace_id>/integrations/google-ads/auth/', views.GoogleAdsOAuthInitView.as_view(), name='google-ads-auth'),
    path('workspaces/<uuid:workspace_id>/integrations/google-ads/callback/', views.GoogleAdsOAuthCallbackView.as_view(), name='google-ads-callback'),
    path('workspaces/<uuid:workspace_id>/integrations/google-ads/connections/', views.GoogleAdsConnectionListView.as_view(), name='google-ads-connections'),
    path('workspaces/<uuid:workspace_id>/integrations/google-ads/connections/<uuid:pk>/', views.GoogleAdsConnectionDeleteView.as_view(), name='google-ads-connection-delete'),
    path('workspaces/<uuid:workspace_id>/integrations/google-ads/connections/<uuid:pk>/reauthorize/', views.GoogleAdsReauthorizeView.as_view(), name='google-ads-reauthorize'),
    path('workspaces/<uuid:workspace_id>/integrations/google-ads/connections/<uuid:connection_id>/discover/', views.DiscoverAccountsView.as_view(), name='google-ads-discover'),

    # Monitored accounts
    path('workspaces/<uuid:workspace_id>/accounts/', views.MonitoredAccountListCreateView.as_view(), name='monitored-accounts'),
    path('workspaces/<uuid:workspace_id>/accounts/<uuid:pk>/', views.MonitoredAccountDetailView.as_view(), name='monitored-account-detail'),

    # Slack
    path('workspaces/<uuid:workspace_id>/integrations/slack/callback/', views.SlackOAuthCallbackView.as_view(), name='slack-callback'),
    path('workspaces/<uuid:workspace_id>/integrations/slack/', views.SlackIntegrationView.as_view(), name='slack-integration'),
]
