import json
import logging

import dodopayments
from django.conf import settings
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Workspace
from .models import Invoice, Plan, Subscription
from .serializers import (
    CreateCheckoutSessionSerializer, InvoiceSerializer,
    PlanSerializer, SubscriptionSerializer,
)

logger = logging.getLogger(__name__)


def get_workspace(request, workspace_id):
    return Workspace.objects.get(id=workspace_id, members__user=request.user)


def _dodo_client():
    return dodopayments.DodoPayments(
        bearer_token=settings.DODO_API_KEY,
        webhook_key=settings.DODO_WEBHOOK_SECRET,
        environment=settings.DODO_ENVIRONMENT,
    )


class PlanListView(generics.ListAPIView):
    serializer_class = PlanSerializer
    queryset = Plan.objects.filter(is_active=True).order_by('price_cents')
    pagination_class = None


class SubscriptionView(generics.RetrieveAPIView):
    serializer_class = SubscriptionSerializer

    def get_object(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        try:
            return Subscription.objects.select_related('plan').get(workspace=workspace)
        except Subscription.DoesNotExist:
            raise NotFound('No subscription found.')


class InvoiceListView(generics.ListAPIView):
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        workspace = get_workspace(self.request, self.kwargs['workspace_id'])
        return Invoice.objects.filter(workspace=workspace)


class CreateCheckoutSessionView(APIView):
    def post(self, request, workspace_id):
        workspace = get_workspace(request, workspace_id)

        serializer = CreateCheckoutSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            plan = Plan.objects.get(dodo_product_id=data['dodo_product_id'], is_active=True)
        except Plan.DoesNotExist:
            return Response({'detail': 'Invalid plan.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client = _dodo_client()
            session = client.checkout_sessions.create(
                product_cart=[{'product_id': plan.dodo_product_id, 'quantity': 1}],
                return_url=data['return_url'],
                metadata={'workspace_id': str(workspace.id)},
                customer={'email': request.user.email, 'name': request.user.full_name or request.user.email},
            )
        except Exception as e:
            logger.error('DodoPayments checkout creation failed: %s', e)
            return Response({'detail': 'Could not create checkout session.'}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({'checkout_url': session.checkout_url})


class DodoWebhookView(APIView):
    permission_classes = [AllowAny]

    @csrf_exempt
    def post(self, request):
        payload = request.body.decode('utf-8')
        headers = {k: v for k, v in request.META.items() if k.startswith('HTTP_')}
        # Convert Django META header format (HTTP_X_FOO) → standard (x-foo)
        normalized = {
            k[5:].lower().replace('_', '-'): v
            for k, v in headers.items()
        }

        try:
            client = _dodo_client()
            event = client.webhooks.unwrap(payload, headers=normalized)
        except Exception as e:
            logger.warning('DodoPayments webhook verification failed: %s', e)
            return Response(status=status.HTTP_400_BAD_REQUEST)

        handlers = {
            'subscription.active': _handle_subscription_active,
            'subscription.renewed': _handle_subscription_renewed,
            'subscription.cancelled': _handle_subscription_cancelled,
            'subscription.failed': _handle_subscription_failed,
            'subscription.expired': _handle_subscription_expired,
            'payment.succeeded': _handle_payment_succeeded,
        }
        handler = handlers.get(event.type)
        if handler:
            try:
                handler(event.data)
            except Exception:
                logger.exception('Error handling DodoPayments event %s', event.type)
                return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'received': True})


def _get_or_create_subscription(dodo_sub):
    workspace_id = (dodo_sub.metadata or {}).get('workspace_id')
    if not workspace_id:
        logger.warning('DodoPayments subscription event missing workspace_id in metadata')
        return None, None

    try:
        workspace = Workspace.objects.get(id=workspace_id)
    except Workspace.DoesNotExist:
        logger.error('Workspace %s not found for DodoPayments subscription', workspace_id)
        return None, None

    try:
        plan = Plan.objects.get(dodo_product_id=dodo_sub.product_id)
    except Plan.DoesNotExist:
        logger.error('Plan with dodo_product_id=%s not found', dodo_sub.product_id)
        return None, None

    return workspace, plan


def _handle_subscription_active(dodo_sub):
    workspace, plan = _get_or_create_subscription(dodo_sub)
    if not workspace:
        return

    Subscription.objects.update_or_create(
        dodo_subscription_id=dodo_sub.subscription_id,
        defaults={
            'workspace': workspace,
            'plan': plan,
            'dodo_customer_id': dodo_sub.customer.customer_id,
            'status': Subscription.STATUS_ACTIVE,
            'current_period_start': dodo_sub.created_at,
            'current_period_end': dodo_sub.next_billing_date,
        },
    )


def _handle_subscription_renewed(dodo_sub):
    try:
        sub = Subscription.objects.get(dodo_subscription_id=dodo_sub.subscription_id)
    except Subscription.DoesNotExist:
        return
    sub.status = Subscription.STATUS_ACTIVE
    sub.current_period_end = dodo_sub.next_billing_date
    sub.save(update_fields=['status', 'current_period_end'])


def _handle_subscription_cancelled(dodo_sub):
    Subscription.objects.filter(dodo_subscription_id=dodo_sub.subscription_id).update(
        status=Subscription.STATUS_CANCELED,
        canceled_at=timezone.now(),
    )


def _handle_subscription_failed(dodo_sub):
    Subscription.objects.filter(dodo_subscription_id=dodo_sub.subscription_id).update(
        status=Subscription.STATUS_PAST_DUE,
    )


def _handle_subscription_expired(dodo_sub):
    Subscription.objects.filter(dodo_subscription_id=dodo_sub.subscription_id).update(
        status=Subscription.STATUS_CANCELED,
        canceled_at=timezone.now(),
    )


def _handle_payment_succeeded(payment):
    if not payment.subscription_id:
        return

    try:
        sub = Subscription.objects.select_related('workspace').get(
            dodo_subscription_id=payment.subscription_id,
        )
    except Subscription.DoesNotExist:
        return

    Invoice.objects.update_or_create(
        dodo_payment_id=payment.payment_id,
        defaults={
            'workspace': sub.workspace,
            'subscription': sub,
            'amount_cents': payment.total_amount,
            'currency': payment.currency.lower() if payment.currency else 'usd',
            'status': Invoice.STATUS_PAID,
            'paid_at': timezone.now(),
        },
    )
