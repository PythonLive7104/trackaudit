from .base import BaseCheck, CheckResult


class ZeroConversionsCheck(BaseCheck):
    check_key = 'zero_conversions'
    check_name = 'Zero Conversions Detected'
    category = 'Data Quality'
    default_severity = 'critical'

    LOOKBACK_DAYS = 14

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            actions = client.get_conversion_actions(customer_id)
            stats = client.get_conversion_stats(customer_id, days=self.LOOKBACK_DAYS)
        except Exception as e:
            return self._error('Could not fetch conversion data', str(e))

        active = [a for a in actions if a.status == 'ENABLED' and a.include_in_conversions_metric]
        if not active:
            return self._pass('No active conversion actions — skipping zero conversion check')

        zero_actions = []
        for action in active:
            action_stats = stats.get(action.id, {})
            if action_stats.get('conversions', 0) == 0:
                zero_actions.append(action.name)

        if len(zero_actions) == len(active):
            return self._critical(
                summary=f'0 conversions recorded across all {len(active)} conversion action(s) in the last {self.LOOKBACK_DAYS} days',
                explanation=(
                    f'No conversions have been recorded in the last {self.LOOKBACK_DAYS} days '
                    f'across any active conversion action. This could mean:\n'
                    f'- Conversion tags are broken or not firing\n'
                    f'- The account\'s campaigns have zero traffic\n'
                    f'- A recent site change broke the tracking code'
                ),
                fix=(
                    '1. Check Google Ads → Campaigns → Columns to confirm conversions column.\n'
                    '2. Use Google Tag Assistant to test that conversion tags fire when completing a conversion.\n'
                    '3. Review recent GTM/website changes that could have removed the tag.\n'
                    '4. Check if campaigns are actively running and receiving impressions.\n'
                    '5. If using GA4 import, verify the GA4 → Google Ads link is active.'
                ),
                raw_data={'zero_actions': zero_actions, 'lookback_days': self.LOOKBACK_DAYS},
            )

        if zero_actions:
            return self._warn(
                summary=f'{len(zero_actions)} conversion action(s) recorded 0 conversions in the last {self.LOOKBACK_DAYS} days',
                explanation=(
                    f'The following conversion actions show zero conversions recently: '
                    f'{", ".join(zero_actions)}. This may indicate broken tags or misconfigured actions.'
                ),
                fix=(
                    '1. For each listed action, use Tag Assistant to verify the tag fires.\n'
                    '2. Check if the conversion action type still matches the tracking method.\n'
                    '3. Consider pausing zero-conversion actions if they are obsolete.'
                ),
                raw_data={'zero_actions': zero_actions},
            )

        total = sum(v.get('conversions', 0) for v in stats.values())
        return self._pass(
            f'{total:.0f} total conversions recorded in the last {self.LOOKBACK_DAYS} days',
            raw_data={'total_conversions': total, 'lookback_days': self.LOOKBACK_DAYS},
        )


class ConversionCountSpikeCheck(BaseCheck):
    check_key = 'conversion_count_spike'
    check_name = 'Conversion Count Anomaly'
    category = 'Data Quality'
    default_severity = 'high'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            recent = client.get_conversion_stats(customer_id, days=7)
            baseline = client.get_conversion_stats(customer_id, days=30)
        except Exception as e:
            return self._error('Could not fetch conversion stats', str(e))

        if not recent or not baseline:
            return self._pass('Insufficient data to check for anomalies')

        recent_total = sum(v.get('conversions', 0) for v in recent.values())
        baseline_total = sum(v.get('conversions', 0) for v in baseline.values())

        if baseline_total == 0:
            return self._pass('No baseline conversion data available')

        # Daily average comparison: last 7 days vs last 30 days
        recent_daily = recent_total / 7
        baseline_daily = baseline_total / 30

        if baseline_daily == 0:
            return self._pass('No baseline conversion data for comparison')

        ratio = recent_daily / baseline_daily

        if ratio > 5.0:
            return self._critical(
                summary=f'Conversion count spike: {ratio:.1f}x above 30-day average',
                explanation=(
                    f'Daily conversions in the last 7 days ({recent_daily:.1f}/day) are '
                    f'{ratio:.1f}x higher than the 30-day average ({baseline_daily:.1f}/day). '
                    f'This may indicate duplicate tracking, misconfigured counting type '
                    f'(MANY_PER_CLICK instead of ONE_PER_CLICK), or a tag firing on every page load.'
                ),
                fix=(
                    '1. Audit recent GTM or tag changes for duplicate or mis-scoped triggers.\n'
                    '2. Check the counting type on conversion actions — use ONE_PER_CLICK for leads.\n'
                    '3. Use Google Tag Assistant to confirm tags only fire once per conversion.\n'
                    '4. Review the conversion action\'s trigger conditions in GTM.'
                ),
                raw_data={'recent_daily': recent_daily, 'baseline_daily': baseline_daily, 'ratio': ratio},
            )

        if ratio < 0.1:
            return self._warn(
                summary=f'Conversion count drop: {ratio:.1%} of 30-day average',
                explanation=(
                    f'Daily conversions have dropped significantly compared to the 30-day baseline. '
                    f'This may indicate a tracking breakage, seasonal effect, or campaign pause.'
                ),
                fix=(
                    '1. Check if campaigns are still active and receiving traffic.\n'
                    '2. Verify tags are still firing using Tag Assistant.\n'
                    '3. Review any recent website or GTM deployments.\n'
                    '4. Compare vs prior year same period to rule out seasonality.'
                ),
                raw_data={'recent_daily': recent_daily, 'baseline_daily': baseline_daily, 'ratio': ratio},
            )

        return self._pass(
            f'Conversion counts within normal range ({ratio:.1f}x vs 30-day average)',
            raw_data={'recent_daily': recent_daily, 'baseline_daily': baseline_daily, 'ratio': ratio},
        )
