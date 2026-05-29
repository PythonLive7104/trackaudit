import logging

import resend
from django.conf import settings

logger = logging.getLogger(__name__)

_APP_NAME = 'TrackAudit'


def _send(to_email: str, subject: str, html_content: str) -> None:
    if not settings.RESEND_API_KEY:
        logger.warning('RESEND_API_KEY not set — skipping email to %s', to_email)
        return
    resend.api_key = settings.RESEND_API_KEY
    try:
        resend.Emails.send({
            'from': settings.DEFAULT_FROM_EMAIL,
            'to': [to_email],
            'subject': subject,
            'html': html_content,
        })
    except Exception:
        logger.exception('Resend send failed to %s', to_email)
        raise


def send_password_reset_email(user, token) -> None:
    reset_url = f'{settings.FRONTEND_URL}/auth/reset-password?token={token.token}'
    name = user.first_name or 'there'
    _send(
        to_email=user.email,
        subject=f'Reset your {_APP_NAME} password',
        html_content=f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#1E293B">Reset your password</h2>
          <p>Hi {name},</p>
          <p>We received a request to reset your {_APP_NAME} password.
             Click below to choose a new one. This link expires in <strong>1 hour</strong>.</p>
          <p style="margin:24px 0">
            <a href="{reset_url}"
               style="background:#3B82F6;color:#fff;padding:12px 24px;border-radius:6px;
                      text-decoration:none;font-weight:600;display:inline-block">
              Reset Password
            </a>
          </p>
          <p style="color:#64748B;font-size:13px">
            If you didn't request this, you can safely ignore this email.
          </p>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0">
          <p style="color:#94A3B8;font-size:12px">— The {_APP_NAME} Team</p>
        </div>
        """,
    )


def send_invite_email(invitation) -> None:
    invite_url = f'{settings.FRONTEND_URL}/invitations/{invitation.token}/accept'
    expires = invitation.expires_at.strftime('%B %d, %Y')
    _send(
        to_email=invitation.email,
        subject=f"You've been invited to join {invitation.workspace.name} on {_APP_NAME}",
        html_content=f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#1E293B">You've been invited</h2>
          <p>You've been invited to join <strong>{invitation.workspace.name}</strong>
             on {_APP_NAME} as <strong>{invitation.role}</strong>.</p>
          <p style="margin:24px 0">
            <a href="{invite_url}"
               style="background:#3B82F6;color:#fff;padding:12px 24px;border-radius:6px;
                      text-decoration:none;font-weight:600;display:inline-block">
              Accept Invitation
            </a>
          </p>
          <p style="color:#64748B;font-size:13px">This invitation expires on {expires}.</p>
          <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0">
          <p style="color:#94A3B8;font-size:12px">— The {_APP_NAME} Team</p>
        </div>
        """,
    )
