from rest_framework.permissions import BasePermission
from .models import WorkspaceMember


class IsWorkspaceMember(BasePermission):
    def has_object_permission(self, request, view, obj):
        workspace = getattr(obj, 'workspace', obj)
        return WorkspaceMember.objects.filter(workspace=workspace, user=request.user).exists()


class IsWorkspaceAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        workspace = getattr(obj, 'workspace', obj)
        return WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
            role=WorkspaceMember.ROLE_ADMIN,
        ).exists()


def get_workspace_role(user, workspace):
    try:
        return WorkspaceMember.objects.get(workspace=workspace, user=user).role
    except WorkspaceMember.DoesNotExist:
        return None


def user_is_workspace_admin(user, workspace):
    return get_workspace_role(user, workspace) == WorkspaceMember.ROLE_ADMIN


def user_is_workspace_member(user, workspace):
    return get_workspace_role(user, workspace) in (
        WorkspaceMember.ROLE_ADMIN,
        WorkspaceMember.ROLE_MEMBER,
    )
