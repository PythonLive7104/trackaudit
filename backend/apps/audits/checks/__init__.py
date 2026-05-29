from .conversion_tracking import (
    ConversionActionsExistCheck,
    DuplicateConversionActionsCheck,
    ConversionCategoryCheck,
    AutoTaggingCheck,
    ConversionWindowCheck,
)
from .consent_mode import (
    ConsentModeEnabledCheck,
    ConsentModeSignalCheck,
)
from .enhanced_conversions import (
    EnhancedConversionsCheck,
    EnhancedConversionsConfiguredCheck,
)
from .data_quality import (
    ZeroConversionsCheck,
    ConversionCountSpikeCheck,
)
from .ga4_integration import (
    GA4LinkedCheck,
    GA4ImportConversionsCheck,
)
from .bid_strategy import (
    SmartBiddingWithoutDataCheck,
    ValueBiddingReadinessCheck,
)
from .value_tracking import (
    ConversionValueCheck,
    CountingTypeCheck,
)
from .tag_health import (
    TagStatusCheck,
    UnverifiedTagsCheck,
)

ALL_CHECKS = [
    # Conversion Tracking
    ConversionActionsExistCheck,
    DuplicateConversionActionsCheck,
    ConversionCategoryCheck,
    AutoTaggingCheck,
    ConversionWindowCheck,
    # Consent Mode
    ConsentModeEnabledCheck,
    ConsentModeSignalCheck,
    # Enhanced Conversions
    EnhancedConversionsCheck,
    EnhancedConversionsConfiguredCheck,
    # Data Quality
    ZeroConversionsCheck,
    ConversionCountSpikeCheck,
    # GA4 Integration
    GA4LinkedCheck,
    GA4ImportConversionsCheck,
    # Bid Strategy
    SmartBiddingWithoutDataCheck,
    ValueBiddingReadinessCheck,
    # Value Tracking
    ConversionValueCheck,
    CountingTypeCheck,
    # Tag Health
    TagStatusCheck,
    UnverifiedTagsCheck,
]
