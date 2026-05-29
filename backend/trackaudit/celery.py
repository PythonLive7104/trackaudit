import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trackaudit.settings.development')

app = Celery('trackaudit')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'run-scheduled-audits': {
        'task': 'apps.audits.tasks.run_scheduled_audits',
        'schedule': crontab(minute='*/15'),
    },
    'send-daily-alert-digest': {
        'task': 'apps.alerts.tasks.send_daily_digest',
        'schedule': crontab(hour=8, minute=0),
    },
}
