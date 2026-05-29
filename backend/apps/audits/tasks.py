import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def run_audit_task(self, audit_run_id: str):
    """Execute a single audit run."""
    from .models import AuditRun, AuditCheck, HealthScoreHistory
    from .health_score import calculate_health_score
    from .checks import ALL_CHECKS

    try:
        audit_run = AuditRun.objects.select_related(
            'account__connection',
            'account__workspace',
        ).get(id=audit_run_id)
    except AuditRun.DoesNotExist:
        logger.error('AuditRun %s not found', audit_run_id)
        return

    audit_run.status = AuditRun.STATUS_RUNNING
    audit_run.started_at = timezone.now()
    audit_run.save(update_fields=['status', 'started_at'])

    try:
        from integrations.google_ads.client import GoogleAdsClient
        conn = audit_run.account.connection
        client = GoogleAdsClient(
            refresh_token=conn.refresh_token,
            customer_id=audit_run.account.customer_id_clean,
        )
        customer_id = audit_run.account.customer_id_clean

        check_results = []
        for CheckClass in ALL_CHECKS:
            check = CheckClass()
            try:
                result = check.run(customer_id, client)
            except Exception as exc:
                logger.exception('Check %s failed unexpectedly: %s', CheckClass.check_key, exc)
                result = check._error(f'{CheckClass.check_name} failed', str(exc))
            check_results.append(result)

        # Persist check results
        check_objects = []
        for result in check_results:
            check_objects.append(AuditCheck(
                audit_run=audit_run,
                check_key=result.check_key,
                check_name=result.check_name,
                category=result.category,
                status=result.status,
                severity=result.severity,
                finding_summary=result.finding_summary,
                explanation=result.explanation,
                fix_instructions=result.fix_instructions,
                raw_data=result.raw_data,
            ))
        AuditCheck.objects.bulk_create(check_objects)

        # Tally counts
        audit_run.pass_count = sum(1 for r in check_results if r.status == 'pass')
        audit_run.warning_count = sum(1 for r in check_results if r.status == 'warning')
        audit_run.critical_count = sum(1 for r in check_results if r.status == 'critical')
        audit_run.error_count = sum(1 for r in check_results if r.status == 'error')

        # Calculate and store health score
        score = calculate_health_score(check_objects)
        audit_run.health_score = score
        HealthScoreHistory.objects.create(
            account=audit_run.account,
            audit_run=audit_run,
            score=score,
        )

        audit_run.status = AuditRun.STATUS_COMPLETED
        audit_run.completed_at = timezone.now()
        audit_run.save(update_fields=[
            'status', 'completed_at', 'health_score',
            'pass_count', 'warning_count', 'critical_count', 'error_count',
        ])

        # Update schedule timestamps
        from .models import AuditSchedule
        AuditSchedule.objects.filter(account=audit_run.account).update(
            last_run_at=timezone.now(),
        )

        # Create alerts for new critical/warning issues
        _create_alerts_from_checks(audit_run, check_objects)

        logger.info(
            'Audit %s completed: score=%s pass=%s warn=%s crit=%s',
            audit_run_id, score,
            audit_run.pass_count, audit_run.warning_count, audit_run.critical_count,
        )

    except Exception as exc:
        logger.exception('Audit %s failed: %s', audit_run_id, exc)
        audit_run.status = AuditRun.STATUS_FAILED
        audit_run.failure_reason = str(exc)
        audit_run.completed_at = timezone.now()
        audit_run.save(update_fields=['status', 'failure_reason', 'completed_at'])
        raise self.retry(exc=exc)


def _create_alerts_from_checks(audit_run, check_objects):
    """Create or update Alert records for failed checks."""
    from alerts.models import Alert
    from alerts.tasks import deliver_alert

    actionable_statuses = ('critical', 'warning')
    for check in check_objects:
        if check.status not in actionable_statuses:
            continue

        severity_map = {'critical': Alert.SEVERITY_CRITICAL, 'warning': Alert.SEVERITY_WARNING}
        alert, created = Alert.objects.get_or_create(
            workspace=audit_run.account.workspace,
            account=audit_run.account,
            check_key=check.check_key,
            status__in=[Alert.STATUS_OPEN, Alert.STATUS_SNOOZED],
            defaults={
                'audit_check': check,
                'severity': severity_map.get(check.status, Alert.SEVERITY_WARNING),
                'title': check.check_name,
                'description': check.finding_summary,
            },
        )
        if created:
            deliver_alert.delay(str(alert.id))
        else:
            alert.last_seen_at = timezone.now()
            alert.save(update_fields=['last_seen_at'])


@shared_task
def run_scheduled_audits():
    """Triggered every 15 minutes by Celery Beat. Enqueues overdue audits."""
    from .models import AuditRun, AuditSchedule
    from integrations.models import MonitoredAccount
    from datetime import timedelta

    now = timezone.now()
    due_schedules = AuditSchedule.objects.filter(
        is_active=True,
        account__status=MonitoredAccount.STATUS_ACTIVE,
    ).filter(
        models.Q(next_run_at__lte=now) | models.Q(next_run_at__isnull=True)
    ).select_related('account')

    from django.db import models
    enqueued = 0
    for schedule in due_schedules:
        audit_run = AuditRun.objects.create(
            account=schedule.account,
            trigger_type=AuditRun.TRIGGER_SCHEDULED,
            status=AuditRun.STATUS_QUEUED,
        )

        # Calculate next run time
        delta = timedelta(days=1) if schedule.frequency == AuditSchedule.FREQUENCY_DAILY else timedelta(weeks=1)
        schedule.next_run_at = now + delta
        schedule.save(update_fields=['next_run_at'])

        run_audit_task.delay(str(audit_run.id))
        enqueued += 1

    logger.info('Enqueued %s scheduled audit(s)', enqueued)
    return enqueued
