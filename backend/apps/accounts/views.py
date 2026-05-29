import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import User, Workspace, WorkspaceMember, Invitation, PasswordResetToken
from .permissions import user_is_workspace_admin
from .serializers import (
    RegisterSerializer, TrackAuditTokenObtainPairSerializer, UserSerializer,
    WorkspaceSerializer, WorkspaceMemberSerializer, InvitationSerializer,
    InviteSerializer, PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    GoogleAuthSerializer,
)

logger = logging.getLogger(__name__)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = TrackAuditTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data['refresh']
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user_info = self._exchange_google_code(serializer.validated_data['code'])
        except Exception as e:
            logger.error('Google OAuth exchange failed: %s', e)
            return Response({'detail': 'Google authentication failed.'}, status=status.HTTP_400_BAD_REQUEST)

        email = user_info['email']
        google_id = user_info['sub']
        full_name = user_info.get('name', '')
        avatar_url = user_info.get('picture', '')

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'full_name': full_name,
                'avatar_url': avatar_url,
                'google_id': google_id,
                'email_verified': True,
            },
        )

        if not created:
            if not user.google_id:
                user.google_id = google_id
                user.save(update_fields=['google_id'])

        if created and serializer.validated_data.get('workspace_name'):
            from django.utils.text import slugify
            import uuid
            workspace_name = serializer.validated_data['workspace_name']
            slug = slugify(workspace_name)[:90]
            if Workspace.objects.filter(slug=slug).exists():
                slug = f'{slug}-{str(uuid.uuid4())[:8]}'
            workspace = Workspace.objects.create(name=workspace_name, slug=slug, owner=user)
            WorkspaceMember.objects.create(workspace=workspace, user=user, role=WorkspaceMember.ROLE_ADMIN)

        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'created': created,
        })

    def _exchange_google_code(self, code):
        import requests
        token_response = requests.post('https://oauth2.googleapis.com/token', data={
            'code': code,
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'redirect_uri': f'{settings.FRONTEND_URL}/auth/google/callback',
            'grant_type': 'authorization_code',
        })
        token_response.raise_for_status()
        access_token = token_response.json()['access_token']

        user_response = requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
        )
        user_response.raise_for_status()
        return user_response.json()


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
            token = PasswordResetToken.objects.create(
                user=user,
                expires_at=timezone.now() + timedelta(hours=1),
            )
            from .emails import send_password_reset_email
            try:
                send_password_reset_email(user, token)
            except Exception:
                logger.exception('Failed to send password reset email to %s', email)
            logger.info('Password reset requested for %s', email)
        except User.DoesNotExist:
            pass  # Fail silently to prevent user enumeration

        return Response({'detail': 'If an account exists, a reset link has been sent.'})


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reset_token = serializer.validated_data['reset_token']
        reset_token.user.set_password(serializer.validated_data['password'])
        reset_token.user.save()
        reset_token.used_at = timezone.now()
        reset_token.save(update_fields=['used_at'])

        return Response({'detail': 'Password updated successfully.'})


# ── Workspace views ──────────────────────────────────────────────────────────

class WorkspaceListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkspaceSerializer
    pagination_class = None

    def get_queryset(self):
        return Workspace.objects.filter(members__user=self.request.user).distinct()

    def perform_create(self, serializer):
        from django.utils.text import slugify
        import uuid
        name = serializer.validated_data['name']
        slug = slugify(name)[:90]
        if Workspace.objects.filter(slug=slug).exists():
            slug = f'{slug}-{str(uuid.uuid4())[:8]}'
        workspace = serializer.save(owner=self.request.user, slug=slug)
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=self.request.user,
            role=WorkspaceMember.ROLE_ADMIN,
        )


class WorkspaceDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = WorkspaceSerializer

    def get_queryset(self):
        return Workspace.objects.filter(members__user=self.request.user)


class WorkspaceMemberListView(generics.ListAPIView):
    serializer_class = WorkspaceMemberSerializer

    def get_queryset(self):
        workspace = Workspace.objects.get(id=self.kwargs['workspace_id'], members__user=self.request.user)
        return WorkspaceMember.objects.filter(workspace=workspace).select_related('user')


class WorkspaceMemberUpdateView(generics.UpdateAPIView):
    serializer_class = WorkspaceMemberSerializer

    def get_queryset(self):
        return WorkspaceMember.objects.filter(
            workspace_id=self.kwargs['workspace_id'],
            workspace__members__user=self.request.user,
        )

    def update(self, request, *args, **kwargs):
        member = self.get_object()
        if not user_is_workspace_admin(request.user, member.workspace):
            return Response({'detail': 'Only admins can change roles.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)


class WorkspaceMemberRemoveView(generics.DestroyAPIView):
    def get_queryset(self):
        return WorkspaceMember.objects.filter(workspace_id=self.kwargs['workspace_id'])

    def destroy(self, request, *args, **kwargs):
        member = self.get_object()
        if not user_is_workspace_admin(request.user, member.workspace):
            return Response({'detail': 'Only admins can remove members.'}, status=status.HTTP_403_FORBIDDEN)
        if member.user == member.workspace.owner:
            return Response({'detail': 'Cannot remove workspace owner.'}, status=status.HTTP_400_BAD_REQUEST)
        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InviteView(generics.CreateAPIView):
    serializer_class = InviteSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['workspace'] = Workspace.objects.get(id=self.kwargs['workspace_id'], members__user=self.request.user)
        return ctx

    def create(self, request, *args, **kwargs):
        workspace = Workspace.objects.get(id=self.kwargs['workspace_id'], members__user=request.user)
        if not user_is_workspace_admin(request.user, workspace):
            return Response({'detail': 'Only admins can invite members.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation = serializer.save()
        from .emails import send_invite_email
        try:
            send_invite_email(invitation)
        except Exception:
            logger.exception('Failed to send invite email to %s', invitation.email)
        return Response(InvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)


class InvitationListView(generics.ListAPIView):
    serializer_class = InvitationSerializer

    def get_queryset(self):
        return Invitation.objects.filter(
            workspace_id=self.kwargs['workspace_id'],
            workspace__members__user=self.request.user,
        )


class AcceptInvitationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        try:
            invitation = Invitation.objects.select_related('workspace').get(token=token)
        except Invitation.DoesNotExist:
            return Response({'detail': 'Invalid invitation.'}, status=status.HTTP_404_NOT_FOUND)

        if invitation.is_expired:
            return Response({'detail': 'Invitation has expired.'}, status=status.HTTP_400_BAD_REQUEST)
        if invitation.status != Invitation.STATUS_PENDING:
            return Response({'detail': 'Invitation already used.'}, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.is_authenticated:
            return Response({
                'detail': 'Authentication required.',
                'invitation': InvitationSerializer(invitation).data,
            }, status=status.HTTP_401_UNAUTHORIZED)

        invitation.accept(request.user)
        return Response({'detail': 'Invitation accepted.'})
