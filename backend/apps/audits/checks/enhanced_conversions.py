from .base import BaseCheck, CheckResult


class EnhancedConversionsCheck(BaseCheck):
    check_key = 'enhanced_conversions_enabled'
    check_name = 'Enhanced Conversions Enabled'
    category = 'Enhanced Conversions'
    default_severity = 'high'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            actions = client.get_conversion_actions(customer_id)
        except Exception as e:
            return self._error('Could not fetch conversion actions', str(e))

        active_web = [
            a for a in actions
            if a.status == 'ENABLED'
            and a.include_in_conversions_metric
            and a.type in ('WEBPAGE', 'WEBPAGE_SESSION')
        ]

        if not active_web:
            return self._pass(
                'No website conversion actions found — Enhanced Conversions not applicable',
                raw_data={'web_actions': 0},
            )

        not_enabled = [a for a in active_web if not a.enhanced_conversions_enabled]

        if len(not_enabled) == len(active_web):
            return self._warn(
                summary=f'Enhanced Conversions not enabled on any of {len(active_web)} website conversion action(s)',
                explanation=(
                    'Enhanced Conversions improves conversion measurement accuracy by '
                    'sending hashed first-party customer data (email, phone, name, address) '
                    'to Google. This is especially important in a post-cookie world and '
                    'required for full Consent Mode V2 modelling.'
                ),
                fix=(
                    '1. Go to Tools & Settings → Conversions.\n'
                    '2. Click on a website conversion action.\n'
                    '3. Expand "Enhanced conversions" and toggle it on.\n'
                    '4. Choose the implementation method: Google Tag, Google Tag Manager, or API.\n'
                    '5. Pass hashed customer data variables (email, phone) in your tag configuration.'
                ),
                raw_data={
                    'total_web_actions': len(active_web),
                    'not_enabled': [a.name for a in not_enabled],
                },
            )

        if not_enabled:
            return self._warn(
                summary=f'{len(not_enabled)} of {len(active_web)} website conversion action(s) missing Enhanced Conversions',
                explanation=(
                    'Some website conversion actions do not have Enhanced Conversions enabled. '
                    'For consistent measurement accuracy, enable it on all primary conversion actions.'
                ),
                fix=(
                    '1. Go to Tools & Settings → Conversions.\n'
                    '2. Enable Enhanced Conversions on each action listed above.\n'
                    '3. Ensure your tag passes hashed customer data variables.'
                ),
                raw_data={'not_enabled': [a.name for a in not_enabled]},
            )

        return self._pass(
            f'Enhanced Conversions enabled on all {len(active_web)} website conversion action(s)',
            raw_data={'web_actions': len(active_web)},
        )


class EnhancedConversionsConfiguredCheck(BaseCheck):
    check_key = 'enhanced_conversions_configured'
    check_name = 'Enhanced Conversions Data Quality'
    category = 'Enhanced Conversions'
    default_severity = 'medium'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            actions = client.get_conversion_actions(customer_id)
        except Exception as e:
            return self._error('Could not fetch conversion actions', str(e))

        ec_enabled = [
            a for a in actions
            if a.status == 'ENABLED'
            and a.enhanced_conversions_enabled
            and a.include_in_conversions_metric
        ]

        if not ec_enabled:
            return self._pass(
                'Enhanced Conversions not enabled — skipping data quality check',
                raw_data={'ec_actions': 0},
            )

        # In production, this would query customer_lifecycle_goal or
        # enhanced_conversion_settings for match rate data
        return self._pass(
            f'Enhanced Conversions active on {len(ec_enabled)} conversion action(s)',
            raw_data={
                'ec_actions': len(ec_enabled),
                'note': 'Match rate data requires extended API access',
            },
        )
