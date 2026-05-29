from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    # Auth
    path('register/', views.RegisterView.as_view(), name='auth-register'),
    path('login/', views.LoginView.as_view(), name='auth-login'),
    path('logout/', views.LogoutView.as_view(), name='auth-logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('google/', views.GoogleAuthView.as_view(), name='auth-google'),
    path('me/', views.MeView.as_view(), name='auth-me'),

    # Password reset
    path('password-reset/', views.PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view(), name='password-reset-confirm'),

    # Workspaces
    path('workspaces/', views.WorkspaceListCreateView.as_view(), name='workspace-list'),
    path('workspaces/<uuid:pk>/', views.WorkspaceDetailView.as_view(), name='workspace-detail'),
    path('workspaces/<uuid:workspace_id>/members/', views.WorkspaceMemberListView.as_view(), name='workspace-members'),
    path('workspaces/<uuid:workspace_id>/members/<int:pk>/', views.WorkspaceMemberUpdateView.as_view(), name='workspace-member-update'),
    path('workspaces/<uuid:workspace_id>/members/<int:pk>/remove/', views.WorkspaceMemberRemoveView.as_view(), name='workspace-member-remove'),
    path('workspaces/<uuid:workspace_id>/invite/', views.InviteView.as_view(), name='workspace-invite'),
    path('workspaces/<uuid:workspace_id>/invitations/', views.InvitationListView.as_view(), name='workspace-invitations'),
    path('invitations/<uuid:token>/accept/', views.AcceptInvitationView.as_view(), name='invitation-accept'),
]
