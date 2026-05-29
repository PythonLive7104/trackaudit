export const SITE_URL = 'https://trackaudit.io';
export const SITE_NAME = 'TrackAudit';
export const SITE_TAGLINE = 'Google Ads Conversion Tracking Audit & Monitoring for Agencies';
export const SITE_DESCRIPTION =
  'TrackAudit monitors your Google Ads conversion tracking 24/7. Catch broken tags, consent mode issues, and data gaps before they waste your clients’ ad spend. Built for PPC agencies.';
export const OG_IMAGE = `${SITE_URL}/og-image.png`;
export const TWITTER_HANDLE = '@trackaudit';

export const DEFAULT_SEO = {
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  canonical: SITE_URL,
  ogImage: OG_IMAGE,
};

export function buildTitle(pageTitle: string) {
  return `${pageTitle} — ${SITE_NAME}`;
}
