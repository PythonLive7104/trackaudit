from .base import BaseCheck, CheckResult

_PROBLEM_STATUSES = frozenset({'NEEDS_ATTENTION', 'INACTIVE'})
_UNVERIFIED_STATUS = 'UNVERIFIED'


class TagStatusCheck(BaseCheck):
    check_key = 'tag_status'
    check_name = 'Conversion Tag Status'
    category = 'Tag Health'
    default_severity = 'critical'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            actions = client.get_conversion_actions(customer_id)
        except Exception as e:
            return self._error('Could not fetch conversion actions', str(e))

        active = [
            a for a in actions
            if a.status == 'ENABLED' and a.include_in_conversions_metric and a.tag_snippet_statuses
        ]

        if not active:
            return self._pass(
                'No conversion actions with direct tags to check (may be using imports)',
                raw_data={'tag_actions': 0},
            )

        problem_actions = [
            a for a in active
            if any(s in _PROBLEM_STATUSES for s in a.tag_snippet_statuses)
        ]

        if problem_actions:
            details = []
            for a in problem_actions:
                bad = [s for s in a.tag_snippet_statuses if s in _PROBLEM_STATUSES]
                details.append(f'{a.name} ({", ".join(bad)})')

            return self._critical(
                summary=f'{len(problem_actions)} conversion tag(s) have a NEEDS_ATTENTION or INACTIVE status',
                explanation=(
                    'Google Ads has flagged the following conversion tags as problematic. '
                    'INACTIVE means the tag has not fired in over 7 days. NEEDS_ATTENTION '
                    'means Google detected an issue with the tag implementation:\n\n'
                    + '\n'.join(f'  • {d}' for d in details)
                    + '\n\nThis likely means conversions are not being recorded for these actions.'
                ),
                fix=(
                    '1. Open Google Tag Assistant and navigate to the page where the tag should fire.\n'
                    '2. Complete a test conversion and verify the tag fires without errors.\n'
                    '3. Check for recent website deployments that may have removed or broken the tag.\n'
                    '4. In GTM, use Preview mode to step through the trigger conditions.\n'
                    '5. Verify the conversion action is not paused in Google Ads '
                    '   (Tools & Settings → Conversions).'
                ),
                raw_data={
                    'problem_tags': details,
                    'statuses_found': list({s for a in problem_actions for s in a.tag_snippet_statuses}),
                },
            )

        return self._pass(
            f'All {len(active)} conversion tag(s) have an ACTIVE status',
            raw_data={'active_tags': len(active)},
        )


class UnverifiedTagsCheck(BaseCheck):
    check_key = 'unverified_tags'
    check_name = 'Unverified Conversion Tags'
    category = 'Tag Health'
    default_severity = 'high'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            actions = client.get_conversion_actions(customer_id)
        except Exception as e:
            return self._error('Could not fetch conversion actions', str(e))

        active = [
            a for a in actions
            if a.status == 'ENABLED' and a.include_in_conversions_metric and a.tag_snippet_statuses
        ]

        if not active:
            return self._pass(
                'No conversion actions with direct tags found',
                raw_data={'tag_actions': 0},
            )

        unverified = [
            a for a in active
            if all(s == _UNVERIFIED_STATUS for s in a.tag_snippet_statuses)
            and not any(s in _PROBLEM_STATUSES for s in a.tag_snippet_statuses)
        ]

        if unverified:
            names = [a.name for a in unverified]
            return self._warn(
                summary=f'{len(unverified)} conversion action(s) have never had a tag verification',
                explanation=(
                    'The following conversion actions have tag snippets that have never fired '
                    '(UNVERIFIED status). This means Google has no confirmation the tags are '
                    'installed and working:\n\n'
                    + '\n'.join(f'  • {n}' for n in names)
                    + '\n\nThis could be a new action that has not yet received a conversion, '
                    'or a tag that was never properly installed.'
                ),
                fix=(
                    '1. For newly created conversion actions, perform a test conversion to verify '
                    '   the tag fires correctly.\n'
                    '2. Use Google Tag Assistant (Chrome extension) to check the tag is present '
                    '   and firing on the thank-you/confirmation page.\n'
                    '3. If the action is old and still unverified, the tag likely was never '
                    '   installed — review your GTM or website tag configuration.'
                ),
                raw_data={'unverified_actions': names},
            )

        return self._pass(
            f'All {len(active)} conversion tag(s) have been verified',
            raw_data={'verified': len(active)},
        )
