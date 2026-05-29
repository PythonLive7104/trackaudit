from .base import BaseCheck, CheckResult

_GA4_IMPORT_TYPES = frozenset({
    'GOOGLE_ANALYTICS_4_CUSTOM',
    'GOOGLE_ANALYTICS_4_PURCHASE',
    'UPLOAD_ANALYTICS',
})

_SMART_BIDDING_STRATEGIES = frozenset({
    'TARGET_CPA',
    'TARGET_ROAS',
    'MAXIMIZE_CONVERSIONS',
    'MAXIMIZE_CONVERSION_VALUE',
    'TARGET_IMPRESSION_SHARE',
})


class GA4LinkedCheck(BaseCheck):
    check_key = 'ga4_linked'
    check_name = 'Google Analytics 4 Linked'
    category = 'GA4 Integration'
    default_severity = 'high'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            links = client.get_ga4_links(customer_id)
        except Exception as e:
            return self._error('Could not check GA4 links', str(e))

        if not links:
            return self._warn(
                summary='No Google Analytics 4 property linked to this account',
                explanation=(
                    'Without a GA4 link, you cannot import GA4 conversions into Google Ads, '
                    'and cross-channel attribution data (GA4 → Google Ads) will not flow. '
                    'Smart bidding algorithms that rely on GA4 audience data will also be '
                    'less effective. GA4 linking is now required for full Consent Mode V2 '
                    'modelled conversion support.'
                ),
                fix=(
                    '1. In Google Ads, go to Tools & Settings → Linked accounts → Google Analytics.\n'
                    '2. Click Link next to your GA4 property.\n'
                    '3. In GA4, go to Admin → Google Ads Links and approve the link request.\n'
                    '4. After linking, you can import GA4 conversion events as Google Ads conversions.'
                ),
                raw_data={'ga4_links_found': 0},
            )

        return self._pass(
            f'{len(links)} GA4 property link(s) found',
            raw_data={'ga4_links_found': len(links)},
        )


class GA4ImportConversionsCheck(BaseCheck):
    check_key = 'ga4_import_conversions'
    check_name = 'GA4 Conversion Import Active'
    category = 'GA4 Integration'
    default_severity = 'medium'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            actions = client.get_conversion_actions(customer_id)
        except Exception as e:
            return self._error('Could not fetch conversion actions', str(e))

        active = [a for a in actions if a.status == 'ENABLED' and a.include_in_conversions_metric]
        if not active:
            return self._pass('No active conversion actions — GA4 import check skipped')

        ga4_imports = [a for a in active if a.type in _GA4_IMPORT_TYPES]

        if not ga4_imports:
            # Check if they're using direct tags — then GA4 import isn't strictly needed
            direct_tag_actions = [a for a in active if a.tag_snippets]
            if direct_tag_actions:
                return self._pass(
                    f'{len(direct_tag_actions)} conversion action(s) use direct tag tracking — GA4 import not required',
                    raw_data={'ga4_imports': 0, 'direct_tags': len(direct_tag_actions)},
                )

            return self._warn(
                summary='No GA4 conversion imports found and no direct tags detected',
                explanation=(
                    'This account has conversion actions but none are importing from GA4 or '
                    'using direct tag snippets. GA4-imported conversions are more reliable for '
                    'cross-device attribution and benefit from Consent Mode V2 modelling. '
                    'If you are relying on another method (e.g., phone call imports, CRM uploads), '
                    'this warning may not apply.'
                ),
                fix=(
                    '1. In GA4, go to Admin → Google Ads Links and ensure the link is active.\n'
                    '2. In Google Ads, go to Tools & Settings → Conversions → + New Conversion.\n'
                    '3. Choose "Import" → "Google Analytics 4 properties".\n'
                    '4. Select the GA4 events you want to use as conversions (e.g., purchase, lead_form_submit).\n'
                    '5. These will appear as conversion actions that update automatically from GA4.'
                ),
                raw_data={'ga4_imports': 0, 'direct_tags': 0},
            )

        return self._pass(
            f'{len(ga4_imports)} GA4 import conversion action(s) active',
            raw_data={'ga4_import_actions': [a.name for a in ga4_imports]},
        )
