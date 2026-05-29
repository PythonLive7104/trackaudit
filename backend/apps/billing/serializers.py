from rest_framework import serializers

from .models import Invoice, Plan, Subscription


class PlanSerializer(serializers.ModelSerializer):
    price_dollars = serializers.FloatField(read_only=True)

    class Meta:
        model = Plan
        fields = [
            'id', 'name', 'tier', 'interval', 'price_cents', 'price_dollars',
            'dodo_product_id', 'max_accounts', 'max_members',
            'white_label_enabled', 'audit_frequency_minutes',
        ]


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = PlanSerializer(read_only=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'status', 'is_active',
            'current_period_start', 'current_period_end',
            'trial_ends_at', 'canceled_at', 'created_at',
        ]
        read_only_fields = fields


class InvoiceSerializer(serializers.ModelSerializer):
    amount_dollars = serializers.FloatField(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'dodo_payment_id', 'amount_cents', 'amount_dollars',
            'currency', 'status', 'invoice_pdf_url',
            'period_start', 'period_end', 'paid_at', 'created_at',
        ]
        read_only_fields = fields


class CreateCheckoutSessionSerializer(serializers.Serializer):
    dodo_product_id = serializers.CharField()
    return_url = serializers.URLField()
