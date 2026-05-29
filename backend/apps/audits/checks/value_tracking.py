from .base import BaseCheck, CheckResult

_PURCHASE_CATEGORIES = frozenset({'PURCHASE', 'SALE'})
_LEAD_CATEGORIES = frozenset({'LEAD', 'SUBMIT_LEAD_FORM', 'BOOK_APPOINTMENT', 'REQUEST_QUOTE', 'SIGNUP'})


class ConversionValueCheck(BaseCheck):
    check_key = 'conversion_value_tracking'
    check_name = 'Conversion Value Tracking'
    category = 'Value Tracking'
    default_severity = 'high'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            actions = client.get_conversion_actions(customer_id)
            stats = client.get_conversion_stats(customer_id, days=30)
        except Exception as e:
            return self._error('Could not fetch conversion data', str(e))

        purchase_actions = [
            a for a in actions
            if a.status == 'ENABLED'
            and a.include_in_conversions_metric
            and a.category in _PURCHASE_CATEGORIES
        ]

        if not purchase_actions:
            return self._pass(
                'No purchase/sale conversion actions found — value tracking check not applicable',
                raw_data={'purchase_actions': 0},
            )

        zero_value_actions = []
        for action in purchase_actions:
            action_stats = stats.get(action.id, {})
            conversions = action_stats.get('conversions', 0)
            value = action_stats.get('conversions_value', 0)

            # If there are conversions but no value, it's a problem
            if conversions > 0 and value == 0:
                zero_value_actions.append(action.name)

        if zero_value_actions:
            return self._critical(
                summary=f'{len(zero_value_actions)} purchase conversion action(s) recording conversions but £0 value',
                explanation=(
                    'The following purchase/sale conversion actions have recorded conversions '
                    'in the last 30 days but with zero value. This means revenue data is not '
                    'reaching Google Ads, making ROAS calculations impossible and value-based '
                    'bidding ineffective:\n\n'
                    + '\n'.join(f'  • {n}' for n in zero_value_actions)
                ),
                fix=(
                    '1. Check your conversion tag implementation — ensure the revenue/value '
                    '   variable is being dynamically populated on the order confirmation page.\n'
                    '2. In GTM, verify the purchase event dataLayer push includes a "value" key '
                    '   (e.g., dataLayer.push({event: "purchase", value: 49.99, ...})).\n'
                    '3. If using the Google Ads global site tag directly, verify '
                    '   google_conversion_value is set dynamically.\n'
                    '4. Test with a real purchase or use the Preview mode in GTM to verify '
                    '   the value variable fires correctly.'
                ),
                raw_data={'zero_value_actions': zero_value_actions},
            )

        # Check if no purchase actions have a default value set (they rely on dynamic values)
        no_default_value = [
            a for a in purchase_actions
            if a.value_settings_default_value == 0
        ]
        if len(no_default_value) == len(purchase_actions):
            return self._warn(
                summary='Purchase conversion actions have no default value set — relies entirely on dynamic values',
                explanation=(
                    'None of your purchase conversion actions have a static default value. '
                    'While dynamic values are preferred, if the dynamic value is ever missing '
                    '(e.g., tag fires before dataLayer push), no value will be recorded. '
                    'Setting a fallback default value provides a safety net.'
                ),
                fix=(
                    '1. Go to Tools & Settings → Conversions and edit your purchase conversion action.\n'
                    '2. Set a "Default value" equal to your average order value as a fallback.\n'
                    '3. This will not override dynamic values — it only applies when no dynamic value is passed.'
                ),
                raw_data={'no_default_value': [a.name for a in no_default_value]},
            )

        return self._pass(
            f'{len(purchase_actions)} purchase conversion action(s) are tracking revenue values',
            raw_data={'purchase_actions': len(purchase_actions)},
        )


class CountingTypeCheck(BaseCheck):
    check_key = 'counting_type'
    check_name = 'Conversion Counting Type'
    category = 'Value Tracking'
    default_severity = 'medium'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            actions = client.get_conversion_actions(customer_id)
        except Exception as e:
            return self._error('Could not fetch conversion actions', str(e))

        active = [a for a in actions if a.status == 'ENABLED' and a.include_in_conversions_metric]
        if not active:
            return self._pass('No active conversion actions to check')

        # Lead actions using MANY_PER_CLICK inflate conversion counts
        problem_actions = [
            a for a in active
            if a.category in _LEAD_CATEGORIES and a.counting_type == 'MANY_PER_CLICK'
        ]

        if problem_actions:
            names = [a.name for a in problem_actions]
            return self._warn(
                summary=f'{len(problem_actions)} lead conversion action(s) use MANY_PER_CLICK counting',
                explanation=(
                    'Lead and form submission conversion actions should use ONE_PER_CLICK counting. '
                    'MANY_PER_CLICK counts every form submission from the same click, which can '
                    'inflate lead counts if a user submits the same form multiple times. '
                    'This distorts CPA calculations and misleads bidding algorithms.\n\n'
                    'Affected actions: ' + ', '.join(names)
                ),
                fix=(
                    '1. Go to Tools & Settings → Conversions and edit each affected action.\n'
                    '2. Under "Count", change from "Every" to "One".\n'
                    '3. Note: This change applies to future conversions only — historical data '
                    '   will reflect the old setting.\n'
                    '4. Exception: Keep MANY_PER_CLICK for purchase conversions where repeat '
                    '   purchases from the same click are a genuine business event.'
                ),
                raw_data={'problem_actions': names},
            )

        # Purchase actions using ONE_PER_CLICK miss repeat purchases
        purchase_one_per_click = [
            a for a in active
            if a.category in _PURCHASE_CATEGORIES and a.counting_type == 'ONE_PER_CLICK'
        ]
        if purchase_one_per_click:
            names = [a.name for a in purchase_one_per_click]
            return self._warn(
                summary=f'{len(purchase_one_per_click)} purchase conversion action(s) use ONE_PER_CLICK counting',
                explanation=(
                    'Purchase conversion actions typically should use MANY_PER_CLICK so that '
                    'customers who buy multiple times after clicking the same ad are counted correctly. '
                    'ONE_PER_CLICK would only count the first purchase, understating revenue and ROAS.'
                ),
                fix=(
                    '1. Go to Tools & Settings → Conversions and edit each purchase action.\n'
                    '2. Under "Count", change from "One" to "Every".\n'
                    '3. This ensures each transaction is counted, giving accurate revenue data '
                    '   for ROAS-based bidding strategies.'
                ),
                raw_data={'purchase_one_per_click': names},
            )

        return self._pass(
            f'All {len(active)} conversion action(s) use appropriate counting types',
            raw_data={'checked': len(active)},
        )
