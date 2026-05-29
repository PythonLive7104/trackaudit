from django.urls import path
from . import views

urlpatterns = [
    path('workspaces/<uuid:workspace_id>/alerts/', views.AlertListView.as_view(), name='alert-list'),
    path('workspaces/<uuid:workspace_id>/alerts/stats/', views.AlertStatsView.as_view(), name='alert-stats'),
    path('workspaces/<uuid:workspace_id>/alerts/<uuid:pk>/', views.AlertDetailView.as_view(), name='alert-detail'),
    path('workspaces/<uuid:workspace_id>/alerts/<uuid:pk>/snooze/', views.SnoozeAlertView.as_view(), name='alert-snooze'),
    path('workspaces/<uuid:workspace_id>/alerts/<uuid:pk>/resolve/', views.ResolveAlertView.as_view(), name='alert-resolve'),
    path('workspaces/<uuid:workspace_id>/notifications/', views.NotificationPreferenceView.as_view(), name='notification-prefs'),
    path('workspaces/<uuid:workspace_id>/alert-overrides/', views.AccountAlertOverrideListView.as_view(), name='alert-override-list'),
    path('workspaces/<uuid:workspace_id>/accounts/<uuid:account_id>/alert-override/', views.AccountAlertOverrideView.as_view(), name='alert-override-detail'),
]
