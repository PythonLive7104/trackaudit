from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='plan',
            old_name='stripe_price_id',
            new_name='dodo_product_id',
        ),
        migrations.RenameField(
            model_name='subscription',
            old_name='stripe_customer_id',
            new_name='dodo_customer_id',
        ),
        migrations.RenameField(
            model_name='subscription',
            old_name='stripe_subscription_id',
            new_name='dodo_subscription_id',
        ),
        migrations.RenameField(
            model_name='invoice',
            old_name='stripe_invoice_id',
            new_name='dodo_payment_id',
        ),
    ]
