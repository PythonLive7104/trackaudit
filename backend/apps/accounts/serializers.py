from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from datetime import timedelta
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, Workspace, WorkspaceMember, Invitation, PasswordResetToken


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'avatar_url', 'email_verified', 'created_at']
        read_only_fields = ['id', 'email_verified', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    workspace_name = serializers.CharField(write_only=True, max_length=255)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'password', 'password_confirm', 'workspace_name']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        workspace_name = validated_data.pop('workspace_name')
        validated_data.pop('password_confirm')

        user = User.objects.create_user(**validated_data)

        # Create default workspace
        from django.utils.text import slugify
        import uuid
        slug = slugify(workspace_name)[:90]
        if Workspace.objects.filter(slug=slug).exists():
            slug = f'{slug}-{str(uuid.uuid4())[:8]}'

        workspace = Workspace.objects.create(
            name=workspace_name,
            slug=slug,
            owner=user,
        )
        WorkspaceMember.objects.create(
            workspace=workspace,
            user=user,
            role=WorkspaceMember.ROLE_ADMIN,
        )
        return user


class TrackAuditTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        # Always succeed to avoid user enumeration
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        try:
            reset_token = PasswordResetToken.objects.select_related('user').get(token=attrs['token'])
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError({'token': 'Invalid or expired token.'})
        if not reset_token.is_valid:
            raise serializers.ValidationError({'token': 'Invalid or expired token.'})
        attrs['reset_token'] = reset_token
        return attrs


class WorkspaceSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ['id', 'name', 'slug', 'member_count', 'role', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']

    def get_member_count(self, obj):
        return obj.members.count()

    def get_role(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        try:
            member = obj.members.get(user=request.user)
            return member.role
        except WorkspaceMember.DoesNotExist:
            return None


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = ['id', 'user', 'role', 'joined_at']
        read_only_fields = ['id', 'user', 'joined_at']


class InvitationSerializer(serializers.ModelSerializer):
    invited_by = UserSerializer(read_only=True)

    class Meta:
        model = Invitation
        fields = ['id', 'email', 'role', 'status', 'invited_by', 'created_at', 'expires_at']
        read_only_fields = ['id', 'status', 'invited_by', 'created_at', 'expires_at']


class InviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=WorkspaceMember.ROLE_CHOICES, default=WorkspaceMember.ROLE_MEMBER)

    def validate_email(self, value):
        workspace = self.context['workspace']
        if WorkspaceMember.objects.filter(workspace=workspace, user__email=value).exists():
            raise serializers.ValidationError('This user is already a member.')
        if Invitation.objects.filter(
            workspace=workspace,
            email=value,
            status=Invitation.STATUS_PENDING,
            expires_at__gt=timezone.now(),
        ).exists():
            raise serializers.ValidationError('A pending invitation already exists for this email.')
        return value

    def create(self, validated_data):
        workspace = self.context['workspace']
        inviter = self.context['request'].user
        invitation = Invitation.objects.create(
            workspace=workspace,
            email=validated_data['email'],
            role=validated_data['role'],
            invited_by=inviter,
            expires_at=timezone.now() + timedelta(days=7),
        )
        return invitation


class GoogleAuthSerializer(serializers.Serializer):
    code = serializers.CharField()
    workspace_name = serializers.CharField(required=False, allow_blank=True)
