from django.urls import path
from . import views

urlpatterns = [
    # Dashboard stats
    path('workspaces/<uuid:workspace_id>/dashboard/', views.DashboardStatsView.as_view(), name='dashboard-stats'),

    # Audit runs
    path('workspaces/<uuid:workspace_id>/audits/', views.AuditRunListView.as_view(), name='audit-list'),
    path('workspaces/<uuid:workspace_id>/audits/trigger/', views.TriggerAuditView.as_view(), name='audit-trigger'),
    path('workspaces/<uuid:workspace_id>/audits/<uuid:pk>/', views.AuditRunDetailView.as_view(), name='audit-detail'),
    path('workspaces/<uuid:workspace_id>/audits/<uuid:run_id>/checks/', views.AuditCheckListView.as_view(), name='audit-checks'),

    # Per-account routes
    path('workspaces/<uuid:workspace_id>/accounts/<uuid:account_id>/schedule/', views.AuditScheduleView.as_view(), name='audit-schedule'),
    path('workspaces/<uuid:workspace_id>/accounts/<uuid:account_id>/health-score/', views.HealthScoreHistoryView.as_view(), name='health-score-history'),
    path('workspaces/<uuid:workspace_id>/accounts/<uuid:account_id>/health-history/', views.HealthScoreHistoryView.as_view(), name='health-history'),

    # Workspace-level schedule list (for Monitoring page)
    path('workspaces/<uuid:workspace_id>/schedules/', views.WorkspaceScheduleListView.as_view(), name='schedule-list'),
    path('workspaces/<uuid:workspace_id>/schedules/<int:pk>/', views.WorkspaceScheduleDetailView.as_view(), name='schedule-detail'),
]
