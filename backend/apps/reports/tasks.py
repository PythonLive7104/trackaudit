import logging
import os
from pathlib import Path

from celery import shared_task
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone

from .models import Report

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def generate_report_task(self, report_id: str):
    try:
        report = Report.objects.select_related(
            'account', 'workspace', 'audit_run', 'generated_by',
        ).get(id=report_id)
    except Report.DoesNotExist:
        logger.error('Report %s not found', report_id)
        return

    try:
        _build_pdf(report)
        report.status = Report.STATUS_READY
        report.save(update_fields=['status', 'pdf_url'])
        logger.info('Report %s generated successfully', report_id)
    except Exception as exc:
        logger.exception('Report %s generation failed', report_id)
        report.status = Report.STATUS_FAILED
        report.save(update_fields=['status'])
        raise self.retry(exc=exc)


def _build_pdf(report: Report) -> None:
    """Render HTML template → WeasyPrint PDF → save to media/reports/."""
    from weasyprint import HTML as WeasyHTML

    context = _build_context(report)
    html_string = render_to_string('reports/report.html', context)

    # Save to media/reports/<report_id>.pdf
    reports_dir = Path(settings.MEDIA_ROOT) / 'reports'
    reports_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = reports_dir / f'{report.id}.pdf'

    WeasyHTML(string=html_string, base_url=settings.FRONTEND_URL).write_pdf(str(pdf_path))

    report.pdf_url = f'{settings.MEDIA_URL}reports/{report.id}.pdf'


def _build_context(report: Report) -> dict:
    from audits.models import AuditRun, AuditCheck, HealthScoreHistory

    # White-label config
    wl = getattr(report.workspace, 'white_label_config', None)
    agency_name = (wl.agency_name if wl and wl.agency_name else report.workspace.name)
    logo_url = (wl.logo_url if wl else '')
    primary_color = (wl.primary_color if wl else '#3B82F6')

    # Resolve audit run
    audit_run = report.audit_run
    if audit_run is None:
        audit_run = (
            AuditRun.objects.filter(account=report.account, status=AuditRun.STATUS_COMPLETED)
            .order_by('-completed_at')
            .first()
        )

    checks = []
    pass_count = warning_count = critical_count = error_count = 0
    health_score = 0
    audit_date = None

    if audit_run:
        health_score = audit_run.health_score or 0
        pass_count = audit_run.pass_count
        warning_count = audit_run.warning_count
        critical_count = audit_run.critical_count
        error_count = audit_run.error_count
        audit_date = audit_run.completed_at.strftime('%B %d, %Y %H:%M UTC') if audit_run.completed_at else None
        checks = list(AuditCheck.objects.filter(audit_run=audit_run).order_by('category', 'check_name'))

    critical_checks = [c for c in checks if c.status == AuditCheck.STATUS_CRITICAL]
    warning_checks = [c for c in checks if c.status == AuditCheck.STATUS_WARNING]
    pass_checks = [c for c in checks if c.status == AuditCheck.STATUS_PASS]

    # Top findings for executive summary
    top_findings = []
    for check in critical_checks[:3]:
        top_findings.append(f'[Critical] {check.check_name}: {check.finding_summary}')
    for check in warning_checks[:2]:
        top_findings.append(f'[Warning] {check.check_name}: {check.finding_summary}')

    # Health score color
    if health_score >= 80:
        score_color = '#16A34A'
    elif health_score >= 50:
        score_color = '#D97706'
    else:
        score_color = '#DC2626'

    # Historical health scores (last 6 audit runs)
    history_qs = (
        HealthScoreHistory.objects.filter(account=report.account)
        .select_related('audit_run')
        .order_by('-recorded_at')[:6]
    )
    score_history = [
        {
            'date': h.recorded_at.strftime('%Y-%m-%d'),
            'score': h.score,
            'trigger': h.audit_run.trigger_type if h.audit_run else '—',
        }
        for h in reversed(list(history_qs))
    ]

    return {
        'agency_name': agency_name,
        'logo_url': logo_url,
        'primary_color': primary_color,
        'account_name': report.account.account_name,
        'report_date': timezone.now().strftime('%B %d, %Y'),
        'audit_date': audit_date,
        'health_score': health_score,
        'score_color': score_color,
        'pass_count': pass_count,
        'warning_count': warning_count,
        'critical_count': critical_count,
        'error_count': error_count,
        'critical_checks': critical_checks,
        'warning_checks': warning_checks,
        'pass_checks': pass_checks,
        'top_findings': top_findings,
        'score_history': score_history,
    }
