from django.urls import path
from . import views

urlpatterns = [
    path('workspaces/<uuid:workspace_id>/reports/', views.ReportListView.as_view(), name='report-list'),
    path('workspaces/<uuid:workspace_id>/reports/generate/', views.GenerateReportView.as_view(), name='report-generate'),
    path('workspaces/<uuid:workspace_id>/reports/<uuid:pk>/', views.ReportDetailView.as_view(), name='report-detail'),
    path('workspaces/<uuid:workspace_id>/white-label/', views.WhiteLabelConfigView.as_view(), name='white-label-config'),
    path('reports/share/<uuid:share_token>/', views.SharedReportView.as_view(), name='report-share'),
]
