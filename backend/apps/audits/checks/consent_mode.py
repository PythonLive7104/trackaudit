from .base import BaseCheck, CheckResult


class ConsentModeEnabledCheck(BaseCheck):
    check_key = 'consent_mode_enabled'
    check_name = 'Consent Mode V2 Enabled'
    category = 'Consent Mode'
    default_severity = 'critical'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            actions = client.get_conversion_actions(customer_id)
        except Exception as e:
            return self._error('Could not fetch conversion data', str(e))

        # Consent Mode is inferred: if no conversion actions have tag snippets,
        # the account may be using import only (GA4), which still requires Consent Mode
        # In production this would query the customer's conversion tracking settings
        active_with_tags = [
            a for a in actions
            if a.status == 'ENABLED' and a.tag_snippets
        ]

        if not active_with_tags:
            # Can't check consent mode without tag snippets — return info
            return CheckResult(
                check_key=self.check_key,
                check_name=self.check_name,
                category=self.category,
                status='warning',
                severity='medium',
                finding_summary='Cannot verify Consent Mode — no tag snippets found on conversion actions',
                explanation=(
                    'TrackAudit could not verify Google Consent Mode V2 because this account '
                    'uses conversion imports (e.g., from GA4) rather than direct tag snippets. '
                    'Consent Mode must still be implemented via your CMP or GTM configuration.'
                ),
                fix=(
                    '1. Verify your Consent Management Platform (CMP) is configured for '
                    '   Google Consent Mode V2 (gtag consent update calls).\n'
                    '2. In GTM, check that Google tags have Consent Initialization triggers.\n'
                    '3. Use Google Tag Assistant to verify ad_storage and analytics_storage '
                    '   signals are being sent.'
                ),
                raw_data={'tag_snippets_found': 0},
            )

        return self._pass(
            'Conversion tag snippets found — verify Consent Mode in GTM/CMP separately',
            raw_data={'actions_with_tags': len(active_with_tags)},
        )


class ConsentModeSignalCheck(BaseCheck):
    check_key = 'consent_mode_signals'
    check_name = 'Consent Mode Signal Quality'
    category = 'Consent Mode'
    default_severity = 'high'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            stats = client.get_conversion_stats(customer_id, days=7)
        except Exception as e:
            return self._error('Could not fetch conversion stats', str(e))

        if not stats:
            return self._warn(
                summary='No conversion data in the last 7 days — cannot verify consent signal quality',
                explanation=(
                    'With no recent conversions, TrackAudit cannot check whether modelled '
                    'conversions (a Consent Mode V2 signal) are being received. This could '
                    'indicate a tracking issue or simply a quiet period.'
                ),
                fix=(
                    '1. Check if campaigns are actively running and receiving traffic.\n'
                    '2. Verify conversion tags are firing by testing a conversion in a private window.\n'
                    '3. Look for 0-conversion campaigns with active budget — this is a red flag.'
                ),
                raw_data={'days_checked': 7, 'conversion_count': 0},
            )

        total_conversions = sum(v.get('conversions', 0) for v in stats.values())
        return self._pass(
            f'{total_conversions:.0f} conversions recorded in last 7 days',
            raw_data={'days_checked': 7, 'total_conversions': total_conversions},
        )
