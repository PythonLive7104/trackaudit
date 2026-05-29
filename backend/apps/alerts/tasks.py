import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def deliver_alert(self, alert_id: str):
    """Deliver an alert via all configured channels, respecting account-level overrides."""
    from .models import Alert, AlertDelivery, NotificationPreference, AccountAlertOverride

    try:
        alert = Alert.objects.select_related('workspace', 'account').get(id=alert_id)
    except Alert.DoesNotExist:
        logger.error('Alert %s not found', alert_id)
        return

    try:
        prefs = alert.workspace.notification_preferences
    except NotificationPreference.DoesNotExist:
        prefs = NotificationPreference.objects.create(workspace=alert.workspace)

    # Check account-level override first
    try:
        override = AccountAlertOverride.objects.get(workspace=alert.workspace, account=alert.account)
        if override.is_muted:
            logger.debug('Alert %s suppressed — account is muted', alert_id)
            return
        effective_min_severity = override.effective_min_severity(prefs.min_severity)
    except AccountAlertOverride.DoesNotExist:
        effective_min_severity = prefs.min_severity

    # Severity gate
    severity_order = {'info': 0, 'warning': 1, 'critical': 2}
    if severity_order.get(alert.severity, 0) < severity_order.get(effective_min_severity, 0):
        logger.debug('Alert %s below effective min severity threshold — skipping delivery', alert_id)
        return

    if prefs.email_enabled:
        _deliver_email(alert, prefs)

    if prefs.slack_enabled:
        _deliver_slack(alert)

    if prefs.webhook_url:
        _deliver_webhook(alert, prefs.webhook_url)


def _deliver_email(alert, prefs):
    from .models import AlertDelivery
    from accounts.models import WorkspaceMember

    admin_emails = list(
        WorkspaceMember.objects.filter(
            workspace=alert.workspace,
            role=WorkspaceMember.ROLE_ADMIN,
        ).values_list('user__email', flat=True)
    )

    delivery = AlertDelivery.objects.create(
        alert=alert,
        channel=AlertDelivery.CHANNEL_EMAIL,
        recipient=', '.join(admin_emails),
    )
    try:
        import resend
        from django.conf import settings

        color_map = {'critical': '#EF4444', 'warning': '#F59E0B', 'info': '#3B82F6'}
        color = color_map.get(alert.severity, '#94A3B8')
        subject = f'[{alert.severity.upper()}] {alert.title} — {alert.account.account_name}'
        html = f"""
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <div style="border-left:4px solid {color};padding:16px 20px;background:#F8FAFC;border-radius:4px">
            <h2 style="margin:0 0 8px;color:#1E293B">{alert.title}</h2>
            <p style="margin:4px 0"><strong>Account:</strong> {alert.account.account_name}</p>
            <p style="margin:4px 0"><strong>Severity:</strong>
              <span style="color:{color};font-weight:600">{alert.severity.upper()}</span></p>
            <p style="margin:12px 0 0">{alert.description}</p>
          </div>
          <p style="color:#94A3B8;font-size:12px;margin-top:16px">
            Detected at {alert.first_detected_at.strftime('%Y-%m-%d %H:%M UTC')}
          </p>
        </div>
        """

        if settings.RESEND_API_KEY and admin_emails:
            resend.api_key = settings.RESEND_API_KEY
            for email in admin_emails:
                resend.Emails.send({
                    'from': settings.DEFAULT_FROM_EMAIL,
                    'to': [email],
                    'subject': subject,
                    'html': html,
                })
        else:
            logger.info('EMAIL (no Resend key) [%s] "%s" → %s', alert.severity.upper(), alert.title, admin_emails)

        delivery.status = 'sent'
        delivery.sent_at = timezone.now()
        delivery.save(update_fields=['status', 'sent_at'])
    except Exception as e:
        delivery.status = 'failed'
        delivery.error_message = str(e)
        delivery.save(update_fields=['status', 'error_message'])
        logger.error('Email delivery failed for alert %s: %s', alert.id, e)


def _deliver_slack(alert):
    from .models import AlertDelivery
    from integrations.models import SlackIntegration
    import requests

    delivery = AlertDelivery.objects.create(
        alert=alert,
        channel=AlertDelivery.CHANNEL_SLACK,
        recipient='slack_channel',
    )
    try:
        slack = SlackIntegration.objects.get(workspace=alert.workspace, is_active=True)

        color_map = {'critical': '#EF4444', 'warning': '#F59E0B', 'info': '#3B82F6'}
        payload = {
            'attachments': [{
                'color': color_map.get(alert.severity, '#94A3B8'),
                'blocks': [
                    {
                        'type': 'section',
                        'text': {
                            'type': 'mrkdwn',
                            'text': (
                                f'*[{alert.severity.upper()}] {alert.title}*\n'
                                f'Account: {alert.account.account_name}\n'
                                f'{alert.description}'
                            ),
                        },
                    },
                    {
                        'type': 'actions',
                        'elements': [{
                            'type': 'button',
                            'text': {'type': 'plain_text', 'text': 'View Alert'},
                            'url': f'https://app.trackaudit.io/alerts/{alert.id}',
                        }],
                    },
                ],
            }],
        }
        resp = requests.post(
            'https://slack.com/api/chat.postMessage',
            json={'channel': slack.channel_id, **payload},
            headers={'Authorization': f'Bearer {slack.access_token}'},
            timeout=10,
        )
        resp.raise_for_status()

        delivery.status = 'sent'
        delivery.sent_at = timezone.now()
        delivery.save(update_fields=['status', 'sent_at'])
    except SlackIntegration.DoesNotExist:
        delivery.delete()
    except Exception as e:
        delivery.status = 'failed'
        delivery.error_message = str(e)
        delivery.save(update_fields=['status', 'error_message'])
        logger.error('Slack delivery failed for alert %s: %s', alert.id, e)


def _deliver_webhook(alert, webhook_url: str):
    from .models import AlertDelivery
    import requests

    delivery = AlertDelivery.objects.create(
        alert=alert,
        channel=AlertDelivery.CHANNEL_WEBHOOK,
        recipient=webhook_url,
    )
    try:
        payload = {
            'alert_id': str(alert.id),
            'severity': alert.severity,
            'title': alert.title,
            'description': alert.description,
            'account_name': alert.account.account_name,
            'check_key': alert.check_key,
            'first_detected_at': alert.first_detected_at.isoformat(),
        }
        resp = requests.post(webhook_url, json=payload, timeout=10)
        resp.raise_for_status()

        delivery.status = 'sent'
        delivery.sent_at = timezone.now()
        delivery.save(update_fields=['status', 'sent_at'])
    except Exception as e:
        delivery.status = 'failed'
        delivery.error_message = str(e)
        delivery.save(update_fields=['status', 'error_message'])
        logger.error('Webhook delivery failed for alert %s: %s', alert.id, e)


@shared_task
def send_daily_digest():
    """Send a daily summary email for workspaces with open alerts."""
    from .models import Alert, NotificationPreference

    prefs_with_digest = NotificationPreference.objects.filter(
        daily_digest_enabled=True,
        email_enabled=True,
    ).select_related('workspace')

    for pref in prefs_with_digest:
        open_alerts = Alert.objects.filter(
            workspace=pref.workspace,
            status=Alert.STATUS_OPEN,
        ).count()

        if open_alerts == 0:
            continue

        _send_digest_email(pref, open_alerts)


def _send_digest_email(pref, open_alert_count: int) -> None:
    from .models import Alert
    from accounts.models import WorkspaceMember

    admin_emails = list(
        WorkspaceMember.objects.filter(
            workspace=pref.workspace,
            role=WorkspaceMember.ROLE_ADMIN,
        ).values_list('user__email', flat=True)
    )
    if not admin_emails:
        return

    open_alerts = Alert.objects.filter(workspace=pref.workspace, status=Alert.STATUS_OPEN)
    critical = open_alerts.filter(severity=Alert.SEVERITY_CRITICAL).count()
    warning = open_alerts.filter(severity=Alert.SEVERITY_WARNING).count()
    info = open_alerts.filter(severity=Alert.SEVERITY_INFO).count()

    try:
        import resend
        from django.conf import settings

        html = f"""
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#1E293B">Daily Alert Digest — {pref.workspace.name}</h2>
          <p>You have <strong>{open_alert_count}</strong> open alert(s):</p>
          <table style="border-collapse:collapse;width:100%">
            <tr>
              <td style="padding:8px 12px;background:#FEF2F2;border-radius:4px">
                <strong style="color:#EF4444">Critical</strong></td>
              <td style="padding:8px 12px;font-weight:700">{critical}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#FFFBEB;border-radius:4px">
                <strong style="color:#F59E0B">Warning</strong></td>
              <td style="padding:8px 12px;font-weight:700">{warning}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;background:#EFF6FF;border-radius:4px">
                <strong style="color:#3B82F6">Info</strong></td>
              <td style="padding:8px 12px;font-weight:700">{info}</td>
            </tr>
          </table>
          <p style="margin-top:16px">
            <a href="{settings.FRONTEND_URL}/alerts"
               style="background:#3B82F6;color:#fff;padding:10px 20px;
                      border-radius:6px;text-decoration:none;font-weight:600">
              View All Alerts
            </a>
          </p>
        </div>
        """

        if settings.RESEND_API_KEY:
            resend.api_key = settings.RESEND_API_KEY
            for email in admin_emails:
                resend.Emails.send({
                    'from': settings.DEFAULT_FROM_EMAIL,
                    'to': [email],
                    'subject': f'Daily Alert Digest: {open_alert_count} open alerts — {pref.workspace.name}',
                    'html': html,
                })
        else:
            logger.info('DIGEST (no Resend key): %d alerts for %s', open_alert_count, pref.workspace.name)
    except Exception:
        logger.exception('Failed to send digest email for workspace %s', pref.workspace.id)
