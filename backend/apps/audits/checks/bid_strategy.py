from .base import BaseCheck, CheckResult

_SMART_BIDDING = frozenset({
    'TARGET_CPA',
    'TARGET_ROAS',
    'MAXIMIZE_CONVERSIONS',
    'MAXIMIZE_CONVERSION_VALUE',
})

_REQUIRES_VALUE = frozenset({'TARGET_ROAS', 'MAXIMIZE_CONVERSION_VALUE'})


class SmartBiddingWithoutDataCheck(BaseCheck):
    check_key = 'smart_bidding_without_data'
    check_name = 'Smart Bidding Without Conversion Data'
    category = 'Bid Strategy'
    default_severity = 'critical'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            campaign_stats = client.get_campaign_bid_stats(customer_id)
        except Exception as e:
            return self._error('Could not fetch campaign bid data', str(e))

        if not campaign_stats:
            return self._pass('No enabled campaigns found')

        smart_campaigns = [c for c in campaign_stats if c.bidding_strategy_type in _SMART_BIDDING]
        if not smart_campaigns:
            return self._pass(
                'No smart bidding campaigns found — manual/enhanced CPC in use',
                raw_data={'total_campaigns': len(campaign_stats)},
            )

        blind_campaigns = [c for c in smart_campaigns if c.conversions_30d == 0]

        if blind_campaigns:
            names = [c.campaign_name for c in blind_campaigns]
            return self._critical(
                summary=f'{len(blind_campaigns)} smart bidding campaign(s) recorded 0 conversions in 30 days',
                explanation=(
                    f'Smart bidding strategies (Target CPA, Target ROAS, Maximize Conversions) '
                    f'require conversion data to optimise. The following campaigns are running '
                    f'smart bidding with zero conversions in the last 30 days, meaning the '
                    f'algorithm has no signal to work with and is effectively guessing:\n\n'
                    + '\n'.join(f'  • {n}' for n in names[:10])
                    + (f'\n  …and {len(names) - 10} more' if len(names) > 10 else '')
                ),
                fix=(
                    '1. Verify conversion tracking is working correctly (check Zero Conversions alert).\n'
                    '2. Consider switching these campaigns to Manual CPC or Enhanced CPC until '
                    '   conversion history builds up (minimum ~50 conversions/month recommended).\n'
                    '3. If recently launched, allow 4–6 weeks for the learning period before '
                    '   evaluating performance — but ensure tags are firing first.\n'
                    '4. Use "Maximise Clicks" as an interim strategy to generate traffic while '
                    '   conversion data accumulates.'
                ),
                raw_data={
                    'blind_campaigns': [{'name': c.campaign_name, 'strategy': c.bidding_strategy_type} for c in blind_campaigns],
                    'total_smart_campaigns': len(smart_campaigns),
                },
            )

        low_data = [c for c in smart_campaigns if 0 < c.conversions_30d < 15]
        if low_data:
            return self._warn(
                summary=f'{len(low_data)} smart bidding campaign(s) have fewer than 15 conversions in 30 days',
                explanation=(
                    'Google recommends at least 30–50 conversions per month for smart bidding to '
                    'exit the learning phase and perform reliably. Campaigns with very low conversion '
                    'volume will frequently re-enter the learning phase and may show erratic CPAs.'
                ),
                fix=(
                    '1. Consider consolidating ad groups or campaigns to pool conversion data.\n'
                    '2. If campaign budget is very low, increase it to allow more auction participation.\n'
                    '3. Temporarily use "Maximise Conversions" (no target) instead of Target CPA '
                    '   to accumulate data faster before setting a hard CPA target.'
                ),
                raw_data={
                    'low_data_campaigns': [{'name': c.campaign_name, 'conversions': c.conversions_30d} for c in low_data],
                },
            )

        return self._pass(
            f'{len(smart_campaigns)} smart bidding campaign(s) have sufficient conversion data',
            raw_data={'smart_campaigns': len(smart_campaigns)},
        )


class ValueBiddingReadinessCheck(BaseCheck):
    check_key = 'value_bidding_readiness'
    check_name = 'Value-Based Bidding Readiness'
    category = 'Bid Strategy'
    default_severity = 'medium'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            campaign_stats = client.get_campaign_bid_stats(customer_id)
            actions = client.get_conversion_actions(customer_id)
        except Exception as e:
            return self._error('Could not fetch campaign or conversion data', str(e))

        value_campaigns = [c for c in campaign_stats if c.bidding_strategy_type in _REQUIRES_VALUE]
        if not value_campaigns:
            return self._pass(
                'No Target ROAS or Maximise Conversion Value campaigns — check not applicable',
                raw_data={'value_campaigns': 0},
            )

        # Check if any active conversion actions record value
        active = [a for a in actions if a.status == 'ENABLED' and a.include_in_conversions_metric]
        actions_with_value = [a for a in active if a.value_settings_default_value > 0]

        if not actions_with_value:
            return self._critical(
                summary='Using value-based bidding but no conversion actions record a value',
                explanation=(
                    'Target ROAS and Maximise Conversion Value optimise for revenue, not just '
                    'conversion count. Without conversion values, the algorithm treats every '
                    'conversion as worth the same amount — making ROAS targets meaningless and '
                    'the bid strategy equivalent to Maximise Conversions.'
                ),
                fix=(
                    '1. Go to Tools & Settings → Conversions and edit your primary conversion action.\n'
                    '2. Set a "Default value" (e.g., average order value) or enable dynamic values '
                    '   by passing the value in the conversion tag itself.\n'
                    '3. For e-commerce, use the Google Ads global site tag or GTM purchase tag '
                    '   to pass the transaction revenue dynamically.\n'
                    '4. Alternatively, switch to Target CPA / Maximise Conversions if revenue '
                    '   tracking is not feasible.'
                ),
                raw_data={
                    'value_campaigns': [c.campaign_name for c in value_campaigns],
                    'actions_with_value': 0,
                },
            )

        no_value_campaigns = [c for c in value_campaigns if c.conversions_value_30d == 0]
        if no_value_campaigns:
            return self._warn(
                summary=f'{len(no_value_campaigns)} value-based campaign(s) recorded £0 conversion value in 30 days',
                explanation=(
                    'These campaigns use Target ROAS or Maximise Conversion Value but have '
                    'recorded no conversion value, suggesting the value variable is not being '
                    'passed correctly or campaigns have zero traffic.'
                ),
                fix=(
                    '1. Test a conversion in a private browser window and verify the value '
                    '   is passed in the conversion tag (check the Network tab in DevTools).\n'
                    '2. In Google Tag Manager, confirm the purchase value variable is mapped correctly.\n'
                    '3. Cross-reference with GA4 or your e-commerce platform to verify revenue data.'
                ),
                raw_data={'no_value_campaigns': [c.campaign_name for c in no_value_campaigns]},
            )

        return self._pass(
            f'{len(value_campaigns)} value-based campaign(s) are recording conversion values',
            raw_data={'value_campaigns': len(value_campaigns)},
        )
