"""
Google Ads API client wrapper.

Wraps google-ads-python to provide clean, typed interfaces for
the data TrackAudit's audit engine needs.
"""
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


@dataclass
class ConversionAction:
    resource_name: str
    id: int
    name: str
    status: str                  # ENABLED, REMOVED, HIDDEN
    category: str                # PURCHASE, LEAD, SIGNUP, etc.
    type: str                    # WEBPAGE, PHONE_CALL, IMPORT, etc.
    counting_type: str           # ONE_PER_CLICK, MANY_PER_CLICK
    value_settings_default_value: float
    include_in_conversions_metric: bool
    click_through_lookback_window_days: int
    view_through_lookback_window_days: int
    enhanced_conversions_enabled: bool
    tag_snippets: list = field(default_factory=list)
    tag_snippet_statuses: list = field(default_factory=list)  # UNVERIFIED, ACTIVE, INACTIVE, NEEDS_ATTENTION


@dataclass
class GA4Link:
    id: int
    firebase_app_id: str


@dataclass
class CampaignBidStats:
    campaign_id: int
    campaign_name: str
    bidding_strategy_type: str  # TARGET_CPA, TARGET_ROAS, MAXIMIZE_CONVERSIONS, etc.
    conversions_30d: float
    conversions_value_30d: float


@dataclass
class ConsentModeSettings:
    ad_user_data_consent: str    # GRANTED, DENIED, UNSPECIFIED
    ad_personalization_consent: str
    consent_mode_enabled: bool


@dataclass
class CampaignConversionGoal:
    campaign_id: int
    campaign_name: str
    conversion_action_ids: list[int]
    bidding_strategy_type: str


@dataclass
class AccountInfo:
    customer_id: str
    name: str
    currency_code: str
    time_zone: str
    is_manager: bool
    auto_tagging_enabled: bool


class GoogleAdsClient:
    """
    Wraps the google-ads-python SDK with lazy initialization and
    automatic token refresh.
    """

    def __init__(self, refresh_token: str, customer_id: str = None):
        self.refresh_token = refresh_token
        self.customer_id = customer_id
        self._client = None

    def _get_client(self):
        if self._client is None:
            from google.ads.googleads.client import GoogleAdsClient as SDKClient
            self._client = SDKClient.load_from_dict({
                'developer_token': settings.GOOGLE_ADS_DEVELOPER_TOKEN,
                'client_id': settings.GOOGLE_CLIENT_ID,
                'client_secret': settings.GOOGLE_CLIENT_SECRET,
                'refresh_token': self.refresh_token,
                'use_proto_plus': True,
            })
        return self._client

    def get_accessible_customers(self) -> list[AccountInfo]:
        """Returns all accounts the OAuth credential can access."""
        client = self._get_client()
        service = client.get_service('CustomerService')
        accessible = service.list_accessible_customers()

        accounts = []
        for resource_name in accessible.resource_names:
            customer_id = resource_name.split('/')[-1]
            try:
                info = self._fetch_account_info(customer_id)
                accounts.append(info)
            except Exception as e:
                logger.warning('Could not fetch account info for %s: %s', customer_id, e)
        return accounts

    def _fetch_account_info(self, customer_id: str) -> AccountInfo:
        client = self._get_client()
        ga_service = client.get_service('GoogleAdsService')
        query = """
            SELECT
              customer.id,
              customer.descriptive_name,
              customer.currency_code,
              customer.time_zone,
              customer.manager,
              customer.auto_tagging_enabled
            FROM customer
            LIMIT 1
        """
        response = ga_service.search(customer_id=customer_id, query=query)
        for row in response:
            c = row.customer
            return AccountInfo(
                customer_id=str(c.id),
                name=c.descriptive_name,
                currency_code=c.currency_code,
                time_zone=c.time_zone,
                is_manager=c.manager,
                auto_tagging_enabled=c.auto_tagging_enabled,
            )

    def get_conversion_actions(self, customer_id: str) -> list[ConversionAction]:
        client = self._get_client()
        ga_service = client.get_service('GoogleAdsService')
        query = """
            SELECT
              conversion_action.resource_name,
              conversion_action.id,
              conversion_action.name,
              conversion_action.status,
              conversion_action.category,
              conversion_action.type,
              conversion_action.counting_type,
              conversion_action.value_settings.default_value,
              conversion_action.include_in_conversions_metric,
              conversion_action.click_through_lookback_window_days,
              conversion_action.view_through_lookback_window_days,
              conversion_action.enhanced_conversions_enabled,
              conversion_action.tag_snippets
            FROM conversion_action
        """
        response = ga_service.search(customer_id=customer_id, query=query)
        actions = []
        for row in response:
            ca = row.conversion_action
            actions.append(ConversionAction(
                resource_name=ca.resource_name,
                id=ca.id,
                name=ca.name,
                status=ca.status.name,
                category=ca.category.name,
                type=ca.type_.name,
                counting_type=ca.counting_type.name,
                value_settings_default_value=ca.value_settings.default_value,
                include_in_conversions_metric=ca.include_in_conversions_metric,
                click_through_lookback_window_days=ca.click_through_lookback_window_days,
                view_through_lookback_window_days=ca.view_through_lookback_window_days,
                enhanced_conversions_enabled=ca.enhanced_conversions_enabled,
                tag_snippets=[str(t) for t in ca.tag_snippets],
                tag_snippet_statuses=[t.status.name for t in ca.tag_snippets],
            ))
        return actions

    def get_conversion_stats(self, customer_id: str, days: int = 30) -> dict:
        """Returns conversion counts per action for the last N days."""
        client = self._get_client()
        ga_service = client.get_service('GoogleAdsService')
        query = f"""
            SELECT
              conversion_action.id,
              conversion_action.name,
              metrics.conversions,
              metrics.conversions_value
            FROM conversion_action
            WHERE segments.date DURING LAST_{days}_DAYS
        """
        response = ga_service.search(customer_id=customer_id, query=query)
        stats = {}
        for row in response:
            stats[row.conversion_action.id] = {
                'name': row.conversion_action.name,
                'conversions': row.metrics.conversions,
                'conversions_value': row.metrics.conversions_value,
            }
        return stats

    def get_campaigns(self, customer_id: str) -> list[dict]:
        client = self._get_client()
        ga_service = client.get_service('GoogleAdsService')
        query = """
            SELECT
              campaign.id,
              campaign.name,
              campaign.status,
              campaign.bidding_strategy_type,
              campaign.advertising_channel_type
            FROM campaign
            WHERE campaign.status = 'ENABLED'
        """
        response = ga_service.search(customer_id=customer_id, query=query)
        return [
            {
                'id': row.campaign.id,
                'name': row.campaign.name,
                'status': row.campaign.status.name,
                'bidding_strategy_type': row.campaign.bidding_strategy_type.name,
                'channel_type': row.campaign.advertising_channel_type.name,
            }
            for row in response
        ]

    def get_ga4_links(self, customer_id: str) -> list[GA4Link]:
        """Returns GA4 property links attached to this Google Ads account."""
        client = self._get_client()
        ga_service = client.get_service('GoogleAdsService')
        query = """
            SELECT
              google_analytics_link.id,
              google_analytics_link.firebase_app_id
            FROM google_analytics_link
        """
        try:
            response = ga_service.search(customer_id=customer_id, query=query)
            return [
                GA4Link(id=row.google_analytics_link.id, firebase_app_id=row.google_analytics_link.firebase_app_id)
                for row in response
            ]
        except Exception as e:
            logger.warning('get_ga4_links failed for %s: %s', customer_id, e)
            return []

    def get_campaign_bid_stats(self, customer_id: str) -> list[CampaignBidStats]:
        """Returns enabled campaigns with their bidding strategy and last-30-day conversion data."""
        client = self._get_client()
        ga_service = client.get_service('GoogleAdsService')
        query = """
            SELECT
              campaign.id,
              campaign.name,
              campaign.bidding_strategy_type,
              metrics.conversions,
              metrics.conversions_value
            FROM campaign
            WHERE campaign.status = 'ENABLED'
              AND segments.date DURING LAST_30_DAYS
        """
        try:
            response = ga_service.search(customer_id=customer_id, query=query)
            stats: dict[int, CampaignBidStats] = {}
            for row in response:
                cid = row.campaign.id
                if cid not in stats:
                    stats[cid] = CampaignBidStats(
                        campaign_id=cid,
                        campaign_name=row.campaign.name,
                        bidding_strategy_type=row.campaign.bidding_strategy_type.name,
                        conversions_30d=0.0,
                        conversions_value_30d=0.0,
                    )
                stats[cid].conversions_30d += row.metrics.conversions
                stats[cid].conversions_value_30d += row.metrics.conversions_value
            return list(stats.values())
        except Exception as e:
            logger.warning('get_campaign_bid_stats failed for %s: %s', customer_id, e)
            return []

    def get_account_budget(self, customer_id: str) -> Optional[float]:
        """Returns total monthly budget across all active campaigns."""
        client = self._get_client()
        ga_service = client.get_service('GoogleAdsService')
        query = """
            SELECT
              campaign_budget.amount_micros
            FROM campaign_budget
            WHERE campaign_budget.explicitly_shared = false
        """
        try:
            response = ga_service.search(customer_id=customer_id, query=query)
            total = sum(row.campaign_budget.amount_micros / 1_000_000 for row in response)
            return total
        except Exception:
            return None
