from .base import BaseCheck, CheckResult


class ConversionActionsExistCheck(BaseCheck):
    check_key = 'conversion_actions_exist'
    check_name = 'Conversion Actions Configured'
    category = 'Conversion Tracking'
    default_severity = 'critical'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            actions = client.get_conversion_actions(customer_id)
        except Exception as e:
            return self._error('Could not fetch conversion actions', str(e))

        active = [a for a in actions if a.status == 'ENABLED']
        if not active:
            return self._critical(
                summary='No active conversion actions found',
                explanation=(
                    'This account has no enabled conversion actions. Google Ads cannot '
                    'optimize campaigns without conversion data. All bid strategies that '
                    'rely on conversions (Target CPA, Target ROAS, Maximize Conversions) '
                    'are effectively blind.'
                ),
                fix=(
                    '1. Go to Tools & Settings → Conversions in Google Ads.\n'
                    '2. Click the blue + button to create a new conversion action.\n'
                    '3. Select the conversion type (website, phone call, import from GA4, etc.).\n'
                    '4. Install the conversion tag via Google Tag Manager or the global site tag.\n'
                    '5. Verify the tag is firing correctly using Google Tag Assistant.'
                ),
                raw_data={'total_actions': len(actions), 'active_actions': 0},
            )

        return self._pass(
            f'{len(active)} active conversion action(s) configured',
            raw_data={'total_actions': len(actions), 'active_actions': len(active)},
        )


class DuplicateConversionActionsCheck(BaseCheck):
    check_key = 'duplicate_conversion_actions'
    check_name = 'Duplicate Conversion Actions'
    category = 'Conversion Tracking'
    default_severity = 'high'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            actions = client.get_conversion_actions(customer_id)
        except Exception as e:
            return self._error('Could not fetch conversion actions', str(e))

        active = [a for a in actions if a.status == 'ENABLED']
        names = [a.name.lower().strip() for a in active]
        duplicates = {name for name in names if names.count(name) > 1}

        if duplicates:
            return self._warn(
                summary=f'{len(duplicates)} duplicate conversion action name(s) detected',
                explanation=(
                    f'The following conversion action names appear more than once: '
                    f'{", ".join(duplicates)}. Duplicate actions inflate conversion counts '
                    f'and distort ROAS calculations, making performance data unreliable.'
                ),
                fix=(
                    '1. Open Tools & Settings → Conversions in Google Ads.\n'
                    '2. Identify the duplicate actions (same name, overlapping tracking).\n'
                    '3. Pause or remove the redundant action — keep the one with the most history.\n'
                    '4. If both are intentional (e.g., GA4 import + manual tag), rename them clearly.'
                ),
                raw_data={'duplicates': list(duplicates)},
            )

        return self._pass(
            'No duplicate conversion action names found',
            raw_data={'checked': len(active)},
        )


class ConversionCategoryCheck(BaseCheck):
    check_key = 'conversion_category'
    check_name = 'Conversion Category Configuration'
    category = 'Conversion Tracking'
    default_severity = 'medium'

    VALUABLE_CATEGORIES = {'PURCHASE', 'LEAD', 'SIGNUP', 'SUBMIT_LEAD_FORM', 'BOOK_APPOINTMENT', 'REQUEST_QUOTE'}

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            actions = client.get_conversion_actions(customer_id)
        except Exception as e:
            return self._error('Could not fetch conversion actions', str(e))

        active = [a for a in actions if a.status == 'ENABLED' and a.include_in_conversions_metric]
        if not active:
            return self._pass('No conversion actions included in conversions metric')

        generic = [a for a in active if a.category not in self.VALUABLE_CATEGORIES]
        if len(generic) == len(active):
            return self._warn(
                summary='All conversion actions use generic categories (e.g., OTHER, PAGE_VIEW)',
                explanation=(
                    'Using generic categories like OTHER or PAGE_VIEW for your primary '
                    'conversions prevents Google\'s smart bidding from properly optimising '
                    'for business value. It also makes reporting less meaningful.'
                ),
                fix=(
                    '1. Go to Tools & Settings → Conversions and edit each conversion action.\n'
                    '2. Update the Category field to match the actual business outcome:\n'
                    '   - Sales/revenue events → Purchase\n'
                    '   - Form submissions / enquiries → Lead\n'
                    '   - Account registrations → Sign-up\n'
                    '3. Save changes — category updates apply going forward.'
                ),
                raw_data={'generic_actions': [a.name for a in generic]},
            )

        return self._pass(
            f'{len(active) - len(generic)} of {len(active)} conversion actions use meaningful categories',
            raw_data={'total': len(active), 'generic': len(generic)},
        )


class AutoTaggingCheck(BaseCheck):
    check_key = 'auto_tagging'
    check_name = 'Auto-Tagging Enabled'
    category = 'Conversion Tracking'
    default_severity = 'high'

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            info = client._fetch_account_info(customer_id)
        except Exception as e:
            return self._error('Could not fetch account settings', str(e))

        if not info.auto_tagging_enabled:
            return self._critical(
                summary='Auto-tagging is disabled',
                explanation=(
                    'Auto-tagging appends the gclid parameter to your ad destination URLs. '
                    'Without it, Google Ads cannot import conversions from Google Analytics 4 '
                    'and cannot attribute conversions to specific campaigns, ad groups, or keywords. '
                    'This breaks GA4 → Google Ads conversion imports entirely.'
                ),
                fix=(
                    '1. Go to Google Ads → Settings (gear icon) → Account Settings.\n'
                    '2. Find the "Auto-tagging" section and toggle it ON.\n'
                    '3. If your website strips URL parameters, contact your developer to '
                    '   allowlist the gclid parameter, or implement parallel tracking.'
                ),
                raw_data={'auto_tagging_enabled': False},
            )

        return self._pass('Auto-tagging is enabled', raw_data={'auto_tagging_enabled': True})


class ConversionWindowCheck(BaseCheck):
    check_key = 'conversion_window'
    check_name = 'Conversion Lookback Window'
    category = 'Conversion Tracking'
    default_severity = 'medium'

    RECOMMENDED_CLICK_WINDOW = 30  # days
    RECOMMENDED_VIEW_WINDOW = 1    # day

    def run(self, customer_id: str, client) -> CheckResult:
        try:
            actions = client.get_conversion_actions(customer_id)
        except Exception as e:
            return self._error('Could not fetch conversion actions', str(e))

        active = [a for a in actions if a.status == 'ENABLED' and a.include_in_conversions_metric]
        if not active:
            return self._pass('No active conversion actions to check')

        short_window = [
            a for a in active
            if a.click_through_lookback_window_days < self.RECOMMENDED_CLICK_WINDOW
        ]
        if short_window:
            return self._warn(
                summary=f'{len(short_window)} conversion action(s) have a short click-through window (<{self.RECOMMENDED_CLICK_WINDOW} days)',
                explanation=(
                    f'Short lookback windows cause conversions that happen after the window '
                    f'to be missed. For most industries, a 30-90 day click-through window '
                    f'is recommended. B2B or high-consideration purchases may need even longer.'
                ),
                fix=(
                    '1. Go to Tools & Settings → Conversions.\n'
                    '2. Click on the conversion action to edit it.\n'
                    '3. Under "Click-through conversion window", increase to 30 days or more.\n'
                    '4. Consider your typical sales cycle when choosing the window.'
                ),
                raw_data={'short_window_actions': [a.name for a in short_window]},
            )

        return self._pass(
            f'All {len(active)} conversion actions have appropriate lookback windows',
            raw_data={'checked': len(active)},
        )
